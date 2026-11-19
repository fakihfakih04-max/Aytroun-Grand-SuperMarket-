
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*','access-control-allow-headers':'content-type,authorization,x-hub-signature-256','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS'}});
const enc=s=>new TextEncoder().encode(s);

async function sign(payload,secret){
 const key=await crypto.subtle.importKey('raw',enc(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sig=await crypto.subtle.sign('HMAC',key,enc(payload));
 return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function token(secret){
 const p=btoa(JSON.stringify({exp:Date.now()+12*60*60*1000}));
 return p+'.'+await sign(p,secret);
}

async function authorized(req,env){
 const t=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 const [p,s]=t.split('.');
 if(!p||!s||s!==await sign(p,env.JWT_SECRET||''))return false;
 try{return JSON.parse(atob(p)).exp>Date.now()}catch{return false}
}

async function rows(db,sql,...args){
 return (await db.prepare(sql).bind(...args).all()).results||[];
}

export default {
 async fetch(req,env){
  if(req.method==='OPTIONS')return new Response(null,{headers:{
   'access-control-allow-origin':'*',
   'access-control-allow-headers':'content-type,authorization',
   'access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS'
  }});

  const u=new URL(req.url),p=u.pathname;

  try{
   if(p==='/api/health')
    return json({ok:true,service:'Aytroun Store API'});

   if(p==='/api/login'&&req.method==='POST'){
    const b=await req.json();
    if(!env.ADMIN_PASSWORD||!env.JWT_SECRET)
     return json({error:'Set ADMIN_PASSWORD and JWT_SECRET in Worker secrets'},503);
    if(b.password!==env.ADMIN_PASSWORD)
     return json({error:'Invalid password'},401);
    return json({token:await token(env.JWT_SECRET)});
   }

   // Product image
   if(p.startsWith('/api/products/')&&p.endsWith('/image')&&req.method==='GET'){
    const id=decodeURIComponent(p.slice('/api/products/'.length,-'/image'.length));
    const r=await env.DB.prepare('SELECT image FROM products WHERE id=?').bind(id).first();
    const image=r?.image||'';

    if(u.searchParams.get('raw')==='1')return json({image});

    const match=image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if(!match)return new Response('',{status:404,headers:{'access-control-allow-origin':'*'}});

    const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
    return new Response(bytes,{status:200,headers:{
     'content-type':match[1],
     'access-control-allow-origin':'*',
     'cache-control':'public, max-age=86400'
    }});
   }

   // Store products
   if(p==='/api/products'&&req.method==='GET'){
    const raw=await rows(env.DB,"SELECT id,name,category,code,barcode,barcode_pac,barcode_box,currency,pc,pac,box,pac_qty,box_qty,description,available,unit_type,weight_mode,is_visible,CASE WHEN image IS NOT NULL AND image<>'' THEN 1 ELSE 0 END AS has_image,updated_at FROM products WHERE available=1 AND is_visible=1 ORDER BY name");
    const cfg=await rows(env.DB,"SELECT value FROM settings WHERE key='category_config'");
    let hidden={};
    try{hidden=JSON.parse(cfg[0]?.value||'{}')}catch{}

    const products=raw.filter(x=>!hidden[x.category]?.hidden).map(x=>({
     ...x,
     prices:{pc:x.pc,pac:x.pac,box:x.box},
     pack_sizes:{pac:x.pac_qty,box:x.box_qty}
    }));
    return json({products});
   }

   // Fast exact barcode lookup across the complete products table (admin only)
   if(p==='/api/admin/product-by-barcode'&&req.method==='GET'){
    if(!await authorized(req,env))return json({error:'Unauthorized'},401);
    const code=(u.searchParams.get('code')||'').trim();
    if(!code)return json({error:'Barcode is required'},400);
    const product=await env.DB.prepare(`SELECT id,name,category,code,barcode,barcode_pac,barcode_box,currency,pc,pac,box,pac_qty,box_qty,description,quantity,available,unit_type,weight_mode,is_visible,CASE WHEN image IS NOT NULL AND image<>'' THEN 1 ELSE 0 END AS has_image,updated_at FROM products WHERE barcode=? OR barcode_pac=? OR barcode_box=? OR code=? OR id=? LIMIT 1`)
      .bind(code,code,code,code,code).first();
    return product?json({product}):json({error:'Product not found'},404);
   }

   // Admin products
   if(p==='/api/admin/products'&&req.method==='GET'){
    if(!await authorized(req,env))return json({error:'Unauthorized'},401);
    const limit=Math.min(200,Math.max(1,Number(u.searchParams.get('limit')||100)));
    const offset=Math.max(0,Number(u.searchParams.get('offset')||0));
    const q=(u.searchParams.get('q')||'').trim();
    const columns="id,name,category,code,barcode,barcode_pac,barcode_box,currency,pc,pac,box,pac_qty,box_qty,description,quantity,available,unit_type,weight_mode,is_visible,CASE WHEN image IS NOT NULL AND image<>'' THEN 1 ELSE 0 END AS has_image,updated_at";
    let products,total;
    if(q){const like='%'+q+'%';const where=' WHERE name LIKE ? OR category LIKE ? OR code LIKE ? OR barcode LIKE ? OR barcode_pac LIKE ? OR barcode_box LIKE ? OR id LIKE ?';
     total=await env.DB.prepare('SELECT COUNT(*) AS n FROM products'+where).bind(like,like,like,like,like,like,like).first();
     products=await rows(env.DB,'SELECT '+columns+' FROM products'+where+' ORDER BY name LIMIT ? OFFSET ?',like,like,like,like,like,like,like,limit,offset);
    }else{total=await env.DB.prepare('SELECT COUNT(*) AS n FROM products').first();products=await rows(env.DB,'SELECT '+columns+' FROM products ORDER BY name LIMIT ? OFFSET ?',limit,offset)}
    return json({products,total:Number(total?.n||0),limit,offset});
   }

   // Latest product and active daily offers (public)
   if(p==='/api/store/highlights'&&req.method==='GET'){
    const latest=await env.DB.prepare("SELECT id,name,category,code,barcode,currency,pc,pac,box,pac_qty,box_qty,description,available,unit_type,weight_mode,is_visible,CASE WHEN image IS NOT NULL AND image<>'' THEN 1 ELSE 0 END AS has_image,updated_at FROM products WHERE available=1 AND is_visible=1 ORDER BY rowid DESC LIMIT 1").first();
    const offers=await rows(env.DB,`SELECT o.id,o.product_id,o.title,o.offer_price,o.start_date,o.end_date,p.name,p.category,p.currency,p.pc,p.pac,p.box,p.image IS NOT NULL AND p.image<>'' AS has_image FROM offers o JOIN products p ON p.id=o.product_id WHERE o.active=1 AND p.available=1 AND p.is_visible=1 AND (o.start_date IS NULL OR o.start_date='' OR o.start_date<=date('now','localtime')) AND (o.end_date IS NULL OR o.end_date='' OR o.end_date>=date('now','localtime')) ORDER BY o.created_at DESC`);
    return json({latest,offers});
   }

   if(p==='/api/settings'&&req.method==='GET'){
    const r=await rows(env.DB,'SELECT key,value FROM settings');
    return json(Object.fromEntries(r.map(x=>[x.key,x.value])));
   }

   if(p==='/api/areas'&&req.method==='GET')
    return json({areas:await rows(env.DB,'SELECT * FROM delivery_areas ORDER BY name')});

   // Create order
   if(p==='/api/orders'&&req.method==='POST'){
    const b=await req.json();
    if(!b.customer_name||!b.phone||!Array.isArray(b.items)||!b.items.length)
     return json({error:'Missing order details'},400);

    const id='AYT-'+Date.now().toString(36).toUpperCase();
    await env.DB.prepare('INSERT INTO orders(id,customer_name,phone,method,area,address,notes,items_json,subtotal_json,delivery_fee,delivery_currency,total_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
     .bind(id,b.customer_name,b.phone,b.method||'Delivery',b.area||'',b.address||'',b.notes||'',JSON.stringify(b.items),JSON.stringify(b.subtotals||{}),Number(b.delivery_fee||0),b.delivery_currency||'USD',JSON.stringify(b.totals||{})).run();

    return json({ok:true,id});
   }

   // All remaining /api routes require Admin authentication
   if(p.startsWith('/api/')&&!await authorized(req,env))
    return json({error:'Unauthorized'},401);

   // Admin offers management
   if(p==='/api/admin/offers'&&req.method==='GET')
    return json({offers:await rows(env.DB,`SELECT o.*,p.name AS product_name FROM offers o LEFT JOIN products p ON p.id=o.product_id ORDER BY o.created_at DESC`)});
   if(p==='/api/admin/offers'&&req.method==='POST'){
    const b=await req.json(); if(!b.product_id||b.offer_price===undefined||b.offer_price===null)return json({error:'Choose product and offer price'},400);
    const id=b.id||crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO offers(id,product_id,title,offer_price,start_date,end_date,active,created_at) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET product_id=excluded.product_id,title=excluded.title,offer_price=excluded.offer_price,start_date=excluded.start_date,end_date=excluded.end_date,active=excluded.active`).bind(id,String(b.product_id),b.title||'عرض يومي',Number(b.offer_price),b.start_date||'',b.end_date||'',Number(b.active??1)).run();
    return json({ok:true,id});
   }
   if(p.startsWith('/api/admin/offers/')&&req.method==='DELETE'){
    await env.DB.prepare('DELETE FROM offers WHERE id=?').bind(decodeURIComponent(p.split('/').pop())).run(); return json({ok:true});
   }

   // Show/hide selected products
   if(p==='/api/products/visibility'&&req.method==='PUT'){
    const b=await req.json();
    if(!Array.isArray(b.ids)||!b.ids.length)
     return json({error:'Select products first'},400);
    if(b.ids.length>500)
     return json({error:'Maximum 500 products per update'},400);

    const v=Number(b.is_visible)?1:0;
    for(const id of b.ids){
     await env.DB.prepare('UPDATE products SET is_visible=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .bind(v,String(id)).run();
    }
    return json({ok:true,updated:b.ids.length,is_visible:v});
   }

   // Import products
   if(p==='/api/admin/import-products'&&req.method==='POST'){
    const b=await req.json();
    if(!Array.isArray(b.items)||b.items.length<1||b.items.length>25)
     return json({error:'Send between 1 and 25 products per request'},400);

    const stmt=env.DB.prepare(`INSERT INTO products(id,name,category,code,barcode,barcode_pac,barcode_box,currency,image,pc,pac,box,pac_qty,box_qty,description,quantity,available,unit_type,weight_mode,is_visible,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
     name=excluded.name,category=excluded.category,code=excluded.code,barcode=excluded.barcode,barcode_pac=excluded.barcode_pac,barcode_box=excluded.barcode_box,
     currency=excluded.currency,
     image=CASE WHEN excluded.image IS NOT NULL AND excluded.image<>'' THEN excluded.image ELSE products.image END,
     pc=excluded.pc,pac=excluded.pac,box=excluded.box,pac_qty=excluded.pac_qty,box_qty=excluded.box_qty,
     description=excluded.description,quantity=excluded.quantity,available=1,
     unit_type=excluded.unit_type,weight_mode=excluded.weight_mode,
     is_visible=COALESCE(products.is_visible,1),updated_at=CURRENT_TIMESTAMP`);

    const batch=[];
    for(const x of b.items){
     if(!x.id||!x.name)continue;
     const image=String(x.image||'');
     if(image.length>450000)
      return json({error:'Compressed image too large for D1 row: '+String(x.name)},413);

     const qty=Number(x.quantity||0);
     batch.push(stmt.bind(String(x.id),String(x.name),x.category||'',x.code||'',x.barcode||'',x.barcode_pac||'',x.barcode_box||'',x.currency||'USD',image,x.pc??null,x.pac??null,x.box??null,x.pac_qty??null,x.box_qty??null,x.description||'',qty,1,x.unit_type==='KG'?'KG':'PC',x.weight_mode==='employee'?'employee':'customer',1));
    }

    if(batch.length)await env.DB.batch(batch);
    return json({ok:true,imported:batch.length});
   }

   // Add or edit product
   if(p==='/api/products'&&req.method==='POST'){
    const b=await req.json();
    if(!b.id||!b.name)return json({error:'Product ID and name required'},400);
    if((b.image||'').length>500000)
     return json({error:'Image too large; choose a smaller image'},413);

    await env.DB.prepare(`INSERT INTO products(id,name,category,code,barcode,barcode_pac,barcode_box,currency,image,pc,pac,box,pac_qty,box_qty,description,quantity,available,unit_type,weight_mode,is_visible,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
     name=excluded.name,category=excluded.category,code=excluded.code,barcode=excluded.barcode,barcode_pac=excluded.barcode_pac,barcode_box=excluded.barcode_box,
     currency=excluded.currency,image=excluded.image,pc=excluded.pc,pac=excluded.pac,box=excluded.box,
     pac_qty=excluded.pac_qty,box_qty=excluded.box_qty,description=excluded.description,
     quantity=excluded.quantity,available=excluded.available,unit_type=excluded.unit_type,
     weight_mode=excluded.weight_mode,is_visible=COALESCE(products.is_visible,1),updated_at=CURRENT_TIMESTAMP`)
     .bind(String(b.id),b.name,b.category||'',b.code||'',b.barcode||'',b.barcode_pac||'',b.barcode_box||'',b.currency||'USD',b.image||'',b.pc??null,b.pac??null,b.box??null,b.pac_qty??null,b.box_qty??null,b.description||'',Number(b.quantity??0),Number(b.available??1),b.unit_type==='KG'?'KG':'PC',b.weight_mode==='employee'?'employee':'customer',Number(b.is_visible??1)).run();

    return json({ok:true});
   }

   // Delete product
   if(p.startsWith('/api/products/')&&req.method==='DELETE'){
    await env.DB.prepare('DELETE FROM products WHERE id=?')
     .bind(decodeURIComponent(p.split('/').pop())).run();
    return json({ok:true});
   }

   // Update settings
   if(p==='/api/settings'&&req.method==='PUT'){
    const b=await req.json();
    if(String(b.logo||'').length>500000)
     return json({error:'Logo too large; choose a smaller image'},413);

    for(const [k,v] of Object.entries(b)){
     await env.DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
      .bind(k,String(v)).run();
    }
    return json({ok:true});
   }

   // Add or edit delivery area
   if(p==='/api/areas'&&req.method==='POST'){
    const b=await req.json();
    if(!b.name)return json({error:'Area name required'},400);
    const id=b.id||crypto.randomUUID();
    await env.DB.prepare('INSERT INTO delivery_areas(id,name,fee,currency) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,fee=excluded.fee,currency=excluded.currency')
     .bind(id,b.name,Number(b.fee||0),b.currency||'USD').run();
    return json({ok:true,id});
   }

   if(p.startsWith('/api/areas/')&&req.method==='DELETE'){
    await env.DB.prepare('DELETE FROM delivery_areas WHERE id=?')
     .bind(decodeURIComponent(p.split('/').pop())).run();
    return json({ok:true});
   }

   // List orders
   if(p==='/api/orders'&&req.method==='GET')
    return json({orders:await rows(env.DB,'SELECT * FROM orders ORDER BY created_at DESC LIMIT 300')});

   // Delete order
   if(p.startsWith('/api/orders/')&&req.method==='DELETE'){
    const id=decodeURIComponent(p.split('/')[3]||'');
    await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(id).run();
    return json({ok:true,deleted:id});
   }

   // Update order status
   if(p.startsWith('/api/orders/')&&req.method==='PUT'){
    const id=decodeURIComponent(p.split('/')[3]||'');
    const b=await req.json();
    await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind(b.status,id).run();
    return json({ok:true});
   }

   return json({error:'Not found'},404);

  }catch(e){
   return json({error:String(e?.message||e)},500);
  }
 }
};
