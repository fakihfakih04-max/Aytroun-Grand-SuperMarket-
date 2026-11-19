
const CFG=window.SFF_CONFIG||{};let products=[],cart=[],installPrompt=null,storeSettings={},deliveryAreas=[];
const money=(v,c="USD")=>new Intl.NumberFormat("en-US",{style:"currency",currency:c,maximumFractionDigits:2}).format(Number(v||0));
const fxRate=()=>Math.max(1,Number(storeSettings.exchange_rate||89500));
const roundedLBP=v=>{let step=Math.max(1,Number(storeSettings.lbp_rounding||1000));return Math.round(Number(v||0)/step)*step};
const dualMoney=(v,c)=>{let n=Number(v||0),usd=c==='LBP'?n/fxRate():n,lbp=c==='LBP'?n:n*fxRate();return `<span>${money(usd,'USD')}</span><br><small class="hint">${Math.round(roundedLBP(lbp)).toLocaleString('en-US')} LBP</small>`};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const price=(p,u)=>p.prices?.[u]??p[u+"_price"]??null, pack=(p,u)=>p.pack_sizes?.[u]??p[u+"_qty"]??null;
function toast(s){let e=document.getElementById("toast");e.textContent=s;e.style.display="block";setTimeout(()=>e.style.display="none",2500)}
function applyStoreSettings(){if(storeSettings.logo)document.querySelector('.logo-banner img').src=storeSettings.logo;deliveryArea.innerHTML='<option value="">اختر المنطقة</option>'+deliveryAreas.map(a=>`<option value="${esc(a.id)}">${esc(a.name)} · ${money(a.fee,a.currency)}</option>`).join("");let catCfg={};try{catCfg=JSON.parse(storeSettings.category_config||'{}')}catch{};products=products.filter(p=>!(catCfg[p.category]||{}).hidden);let cats=[...new Set(products.map(p=>p.category).filter(Boolean))].sort();document.getElementById('category').innerHTML='<option value="">كل التصنيفات</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(catCfg[c]?.name||c)}</option>`).join("");document.getElementById('categoryStrip').innerHTML='<button class="category-chip active" data-cat=""><span class="cat-icon">🛒</span><span class="cat-label">كل المنتجات</span></button>'+cats.map(c=>{let n=catCfg[c]?.name||c;let icon=/fruit|فاكه/i.test(c)?'🍎':/veg|خض/i.test(c)?'🥬':/drink|مشروب|soft/i.test(c)?'🥤':/dairy|cheese|لبن|أجبان/i.test(c)?'🧀':/clean|منظف/i.test(c)?'🧴':'🛍️';let picture=catCfg[c]?.image?`<img class="cat-picture" loading="lazy" src="${esc(catCfg[c].image)}" alt="${esc(n)}">`:`<span class="cat-icon">${icon}</span>`;return `<button class="category-chip" data-cat="${esc(c)}">${picture}<span class="cat-label">${esc(n)}</span></button>`}).join("");document.querySelectorAll('.category-chip').forEach(b=>b.onclick=()=>{category.value=b.dataset.cat;document.querySelectorAll('.category-chip').forEach(x=>x.classList.toggle('active',x===b));draw()});draw()}
async function load(){
 try{
  if(CFG.API_URL&&!CFG.API_URL.includes("YOUR-WORKER")){
   const pr=await fetch(CFG.API_URL+"/api/products");
   if(pr.ok){const d=await pr.json();products=d.products||[];}
   draw();document.getElementById("splash")?.classList.add("hide");
   Promise.all([fetch(CFG.API_URL+"/api/settings"),fetch(CFG.API_URL+"/api/areas")]).then(async([sr,ar])=>{if(sr.ok)storeSettings=await sr.json();if(ar.ok){const d=await ar.json();deliveryAreas=d.areas||[];}applyStoreSettings();}).catch(console.warn);
  }
 }catch(e){console.warn("Backend unavailable; trying static catalog",e);}
 if(!products.length){try{const r=await fetch(CFG.PRODUCTS_URL||"data/products.json",{cache:"no-store"});const d=await r.json();products=Array.isArray(d)?d:(d.products||[]);}catch(e){products=[];}}
 document.getElementById("splash")?.classList.add("hide");applyStoreSettings();
}
let visibleLimit=60,filteredProducts=[];
function draw(){
 let q=search.value.toLowerCase().trim(),cat=category.value,arr=products.filter(p=>(!cat||p.category===cat)&&[p.name,p.category,p.code,p.barcode].some(v=>String(v||"").toLowerCase().includes(q)));
 if(sort.value==="name")arr.sort((a,b)=>String(a.name).localeCompare(String(b.name)));else arr.sort((a,b)=>Number(price(a,"pc")||0)-Number(price(b,"pc")||0));
 filteredProducts=arr;countText.textContent=arr.length+" products";
 const shown=arr.slice(0,visibleLimit);
 productsEl.innerHTML=shown.length?shown.map(p=>{
  const img=`<img class="lazy-product-image" data-product-image="${esc(p.id)}" alt="${esc(p.name)}" loading="lazy" src="assets/icon.svg">`;
  const lines=["pc","pac","box"].map(u=>price(p,u)==null?"":`<div class="price"><span>Retail / ${(effectiveUnitType(p)==='KG'&&u==='pc')?'KG':u.toUpperCase()}${u!=="pc"&&pack(p,u)?` <small class="hint">(${esc(pack(p,u))} pcs)</small>`:""}</span><b>${dualMoney(price(p,u),p.currency||"USD")}</b></div>`).join("");
  const isAvailable=Number(p.available??1)===1;
  return `<article class="card"><div class="photo">${img}</div><div class="body"><div class="name">${esc(p.name)}</div>${p.description?`<div class="muted">${esc(p.description)}</div>`:""}<div class="prices">${lines||'<small class="muted">Price unavailable</small>'}</div><div class="foot"><select id="u-${esc(p.id)}" ${!isAvailable?'disabled':''}><option value="pc">${effectiveUnitType(p)==='KG'?(p.weight_mode==='employee'?'بالقطعة · الوزن عند التحضير':'KG'):'PC'}</option>${price(p,"pac")!=null?'<option value="pac">PAC</option>':""}${price(p,"box")!=null?'<option value="box">BOX</option>':""}</select><button class="btn primary" onclick="add('${esc(p.id)}')" ${!isAvailable?'disabled':''}>${isAvailable?'أضف إلى السلة':'غير متوفر'}</button></div></div></article>`;
 }).join(""):'<div class="empty" style="grid-column:1/-1">لا توجد منتجات ظاهرة حالياً.</div>';
 if(arr.length>visibleLimit)productsEl.insertAdjacentHTML('beforeend',`<button id="loadMore" class="btn gold" style="grid-column:1/-1;width:100%;margin:10px 0">عرض المزيد (${arr.length-visibleLimit})</button>`);
 setupLazyImages();document.getElementById('loadMore')?.addEventListener('click',()=>{visibleLimit+=60;draw()});
}
let imageObserver;
function setupLazyImages(){if(imageObserver)imageObserver.disconnect();const imgs=[...document.querySelectorAll('img[data-product-image]')];if(!('IntersectionObserver'in window)){imgs.forEach(loadProductImage);return;}imageObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){imageObserver.unobserve(e.target);loadProductImage(e.target)}}),{rootMargin:'250px'});imgs.forEach(img=>imageObserver.observe(img));}
async function loadProductImage(img){
 if(img.dataset.loaded)return;img.dataset.loaded='1';
 const imageUrl=CFG.API_URL+'/api/products/'+encodeURIComponent(img.dataset.productImage)+'/image';
 img.onerror=()=>{img.onerror=null;img.style.display='none';};
 img.src=imageUrl;
}

const productsEl=document.getElementById("products"),search=document.getElementById("search"),category=document.getElementById("category"),sort=document.getElementById("sort"),countText=document.getElementById("countText");
function effectiveUnitType(p){
 const category=String(p?.category||'').trim().toLowerCase();
 if(category==='vegetables'||category==='fruits') return 'KG';
 return String(p?.unit_type||'PC').trim().toUpperCase();
}
function isFractionalProduct(p){
 const unit=effectiveUnitType(p);
 const mode=String(p?.weight_mode||'customer').trim().toLowerCase();
 return unit==='KG' && mode!=='employee';
}
function parseQuantity(value){return Number(String(value??'').trim().replace(/\\s/g,'').replace(',','.'));}
function add(id){
 let p=products.find(x=>String(x.id)===String(id)),u=document.getElementById("u-"+id)?.value||"pc";
 if(!p||Number(p.available??1)!==1)return toast("هذا المنتج غير متوفر");
 if(price(p,u)==null)return toast("السعر غير متوفر");
 let k=id+"_"+u,x=cart.find(i=>i.key===k),step=isFractionalProduct(p)?0.5:1;
 if(x)x.qty=Number((x.qty+step).toFixed(2));
 else cart.push({key:k,id:String(id),unit:u,qty:step});
 drawCart();toast("تمت الإضافة إلى السلة");
}
function drawCart(){count.textContent=cart.reduce((s,x)=>s+x.qty,0);items.innerHTML=cart.length?cart.map(x=>{let p=products.find(y=>String(y.id)===x.id),v=Number(price(p,x.unit)||0);return `<div class="item"><div><b>${esc(p.name)}</b><div class="muted">${x.unit.toUpperCase()} · ${money(v,p.currency||"USD")}</div><small>${String(p.unit_type||'').trim().toUpperCase()==='KG'&&String(p.weight_mode||'customer').trim().toLowerCase()==='employee'?'Final price after weighing':`Line: ${money(v*x.qty,p.currency||"USD")}`}</small></div><div class="qty"><button onclick="qty('${x.key}',-1)">−</button><input aria-label="Quantity" type="text" inputmode="decimal" min="${isFractionalProduct(p)?'0.5':'1'}" step="${isFractionalProduct(p)?'0.5':'1'}" value="${x.qty}" style="width:68px;text-align:center;border:1px solid #d8e1d8;border-radius:7px;padding:5px" onchange="setQty('${x.key}',this.value)"><button onclick="qty('${x.key}',1)">+</button></div></div>`}).join(""):'<div class="empty">Your cart is empty.</div>';let totalUSD=cart.reduce((s,x)=>{let p=products.find(y=>String(y.id)===x.id);if(String(p.unit_type||'').trim().toUpperCase()==='KG'&&String(p.weight_mode||'customer').trim().toLowerCase()==='employee')return s;let v=Number(price(p,x.unit)||0),usd=p.currency==='LBP'?v/fxRate():v;return s+usd*x.qty},0);subtotal.innerHTML=dualMoney(totalUSD,'USD');updateDelivery()}
function selectedArea(){return deliveryAreas.find(a=>String(a.id)===String(deliveryArea.value))}function updateDelivery(){let method=document.querySelector('[name="method"]:checked').value,a=selectedArea();let feeUSD=a?(a.currency==='LBP'?Number(a.fee)/fxRate():Number(a.fee)):0;deliveryFee.innerHTML=method==='Pickup'?dualMoney(0,'USD'):a?dualMoney(feeUSD,'USD'):'اختر المنطقة';let subUSD=cart.reduce((s,x)=>{let p=products.find(y=>String(y.id)===x.id);if(String(p.unit_type||'').trim().toUpperCase()==='KG'&&String(p.weight_mode||'customer').trim().toLowerCase()==='employee')return s;let v=Number(price(p,x.unit)||0);return s+(p.currency==='LBP'?v/fxRate():v)*x.qty},0);grandTotal.innerHTML=method==='Pickup'?dualMoney(subUSD,'USD'):a?dualMoney(subUSD+feeUSD,'USD'):'—'}
deliveryArea.onchange=updateDelivery;
function setQty(k,value){
 const x=cart.find(i=>i.key===k);if(!x)return;
 const p=products.find(y=>String(y.id)===x.id),fractional=isFractionalProduct(p),min=fractional?0.5:1;
 const n=parseQuantity(value);
 if(!Number.isFinite(n)||n<min){toast(fractional?'أدخل 0.5 كحد أدنى':'أدخل كمية صحيحة لا تقل عن 1');drawCart();return;}
 x.qty=fractional?Math.max(0.5,Math.round(n*2)/2):Math.max(1,Math.round(n));
 drawCart();
}
function qty(k,d){
 const x=cart.find(i=>i.key===k);if(!x)return;
 const p=products.find(y=>String(y.id)===x.id),step=isFractionalProduct(p)?0.5:1;
 const next=Number((x.qty+d*step).toFixed(2));
 if(next<step){cart=cart.filter(i=>i!==x);drawCart();return;}
 x.qty=next;drawCart();
}
const cartOverlay=document.getElementById("overlay");
const cartDrawer=cartOverlay.querySelector(".drawer");
const cartButton=document.getElementById("cartBtn");
const closeCartButton=document.getElementById("close");
const backToShopButton=document.getElementById("backToShop");
const accountButton=document.getElementById("accountBtn");
function showCart(){
 cartOverlay.classList.add("open");
 document.body.classList.add("cart-open");
}
function hideCart(e){
 if(e){e.preventDefault();e.stopPropagation();}
 cartOverlay.classList.remove("open");
 document.body.classList.remove("cart-open");
}
cartButton.addEventListener("click",e=>{e.preventDefault();showCart();});
// Account opens the cart and moves the drawer itself to customer details.
accountButton?.addEventListener("click",e=>{
 e.preventDefault();
 showCart();
 requestAnimationFrame(()=>{
  const form=document.getElementById("checkout");
  if(form && cartDrawer){
   const drawerTop=cartDrawer.getBoundingClientRect().top;
   const formTop=form.getBoundingClientRect().top;
   cartDrawer.scrollTo({top:cartDrawer.scrollTop+(formTop-drawerTop)-12,behavior:"smooth"});
  }
 });
});
closeCartButton.addEventListener("click",hideCart);
backToShopButton.addEventListener("click",e=>{
 hideCart(e);
 document.getElementById("products")?.scrollIntoView({behavior:"smooth",block:"start"});
});
cartOverlay.addEventListener("click",e=>{if(e.target===cartOverlay)hideCart(e);});
search.oninput=()=>{visibleLimit=60;draw()};category.onchange=()=>{visibleLimit=60;draw()};sort.onchange=()=>{visibleLimit=60;draw()};
function syncPickupDeliveryFields(){
 const isDelivery=document.querySelector('[name="method"]:checked').value==="Delivery";
 addressWrap.style.display=isDelivery?"grid":"none";
 deliveryArea.required=isDelivery;
 deliveryArea.disabled=!isDelivery;
 address.required=isDelivery;
 if(!isDelivery){deliveryArea.value="";address.value="";}
 updateDelivery();
}
document.querySelectorAll('[name="method"]').forEach(x=>x.onchange=syncPickupDeliveryFields);
syncPickupDeliveryFields();
checkout.onsubmit=async e=>{
 e.preventDefault();
 if(!cart.length)return toast("Your cart is empty");
 let wa=String(storeSettings.phone||CFG.WHATSAPP_NUMBER||"").replace(/\D/g,"");
 if(!wa)return toast("Set company WhatsApp number in Admin");
 let method=document.querySelector('[name="method"]:checked').value,addr=address.value.trim(),area=selectedArea();
 if(!custName.value.trim()||!phone.value.trim())return toast("Enter customer name and phone number");
 if(method==="Delivery"&&(!addr||!area))return toast("Choose delivery area and enter address");
 let grouped={};
 cart.forEach(x=>{let p=products.find(y=>String(y.id)===x.id),c=p.currency||"USD";if(!(String(p.unit_type||'').trim().toUpperCase()==='KG'&&String(p.weight_mode||'customer').trim().toLowerCase()==='employee'))grouped[c]=(grouped[c]||0)+Number(price(p,x.unit)||0)*x.qty});
 let fee=method==="Delivery"?Number(area?.fee||0):0;
 let orderItems=cart.map(x=>{let p=products.find(y=>String(y.id)===x.id);return {id:x.id,name:p.name,unit:x.unit,qty:x.qty,price:Number(price(p,x.unit)||0),currency:p.currency||"USD",unit_type:effectiveUnitType(p),weight_mode:p.weight_mode||"customer"}});
 let lines=[`*${storeSettings.store_name||CFG.STORE_NAME||"AYTROUN GRAND SUPERMARKET"} - NEW ORDER*`,"",`Customer: ${custName.value.trim()}`,`Phone: ${phone.value.trim()}`,`Method: ${method}`];
 if(method==="Delivery")lines.push(`Area: ${area.name}`,`Delivery fee: ${money(fee,area.currency)}`,`Address: ${addr}`);
 lines.push("","*ORDER ITEMS*");
 orderItems.forEach((x,i)=>lines.push(`${i+1}. ${x.name} | ${x.qty} x ${x.weight_mode==='employee'?'piece(s) · weight pending':x.unit.toUpperCase()} | ${x.weight_mode==='employee'?'price after weighing':money(x.price,x.currency)}`));
 Object.entries(grouped).forEach(([c,v])=>lines.push(`Subtotal ${c}: ${money(v,c)}`));
 if(notes.value.trim())lines.push("",`Notes: ${notes.value.trim()}`);
 lines.push("","Please confirm this order.");
 const makeWhatsAppUrl=()=>"https://wa.me/"+wa+"?text="+encodeURIComponent(lines.join("\n"));
 // Open synchronously during the button tap. Opening after await is blocked by many mobile browsers.
 let waWindow=null;
 try{waWindow=window.open("about:blank","_blank");if(waWindow)waWindow.opener=null;}catch(err){console.warn("WhatsApp window open",err)}
 const fallbackToWhatsApp=()=>{const url=makeWhatsAppUrl();if(waWindow&&!waWindow.closed){waWindow.location.href=url;}else{window.location.href=url;}};
 let orderId="";
 if(CFG.API_URL&&!CFG.API_URL.includes("YOUR-WORKER")){
  try{
   let r=await fetch(CFG.API_URL+"/api/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({customer_name:custName.value.trim(),phone:phone.value.trim(),method,area:area?.name||"",address:addr,notes:notes.value,items:orderItems,subtotals:grouped,delivery_fee:fee,delivery_currency:area?.currency||"USD",totals:grouped})});
   let d=await r.json();if(r.ok)orderId=d.id;else console.warn("Order save failed",d);
  }catch(err){console.warn("Order API unavailable",err)}
 }
 if(orderId)lines.splice(1,0,`Order ID: ${orderId}`);
 fallbackToWhatsApp();
};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;install.hidden=false;install.onclick=async()=>{installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;install.hidden=true}});
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));setTimeout(()=>document.getElementById("splash")?.classList.add("hide"),2200);load().catch(()=>document.getElementById("splash")?.classList.add("hide"));

// Aytroun mobile barcode + photo lookup
(()=>{
 const modal=document.getElementById('scanModal'),video=document.getElementById('scanVideo'),placeholder=document.getElementById('scanPlaceholder');
 const results=document.getElementById('scanResults'),manual=document.getElementById('scanManual'),photoFile=document.getElementById('photoFile');
 let stream=null,detector=null,scanLoop=false,mode='barcode';
 const stop=()=>{scanLoop=false;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}video.srcObject=null;video.style.display='none';placeholder.style.display='block';};
 const open=(m)=>{mode=m;modal.classList.add('open');results.innerHTML='';manual.style.display=m==='barcode'?'block':'none';document.getElementById('scanTitle').textContent=m==='barcode'?'مسح الباركود':'التعرّف على صورة المنتج';document.getElementById('scanHelp').textContent=m==='barcode'?'وجّه الكاميرا نحو باركود المنتج.':'صوّر المنتج بوضوح، وسنقارن الصورة بصور المنتجات المسجلة بالمتجر.';document.getElementById('takePhoto').hidden=m!=='photo';document.getElementById('startScan').textContent=m==='barcode'?'تشغيل ماسح الباركود':'فتح الكاميرا';};
 const close=()=>{stop();modal.classList.remove('open')};
 document.getElementById('openBarcode').onclick=()=>open('barcode');
 document.getElementById('openPhoto').onclick=()=>open('photo');
 document.getElementById('scanClose').onclick=close;
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 function showMatches(list,label){results.innerHTML='<b>'+label+'</b>'+list.map(p=>{let img=p.has_image?`${CFG.API_URL}/api/products/${encodeURIComponent(p.id)}/image`:(p.image||'');return `<div class="scan-result">${img?`<img src="${esc(img)}" loading="lazy">`:'<div style="width:68px;text-align:center">🛒</div>'}<div class="grow"><b>${esc(p.name)}</b><div class="note">${esc(p.barcode||p.code||'')}</div><div><b>${dualMoney(price(p,'pc'),p.currency||'USD')}</b></div></div><button class="btn primary" type="button" data-addscan="${esc(p.id)}">عرض المنتج</button></div>`}).join('')||'<div class="empty">لم نعثر على منتج مطابق.</div>';results.querySelectorAll('[data-addscan]').forEach(b=>b.onclick=()=>{let p=products.find(x=>String(x.id)===b.dataset.addscan);if(!p)return;close();let el=document.getElementById('search');el.value=p.name;draw();window.scrollTo({top:document.querySelector('.section-head').offsetTop-70,behavior:'smooth'});});}
 function findCode(code){let c=String(code||'').replace(/\s/g,'').toLowerCase();let found=products.filter(p=>[p.barcode,p.code].some(v=>String(v||'').replace(/\s/g,'').toLowerCase()===c));showMatches(found,'نتيجة قراءة الباركود');if(found.length===1){let p=found[0];results.insertAdjacentHTML('afterbegin','<p class="note">تم العثور على المنتج. اضغط «عرض المنتج» للانتقال إليه.</p>')}}
 document.getElementById('findBarcode').onclick=()=>findCode(document.getElementById('barcodeInput').value);
 async function startCamera(){try{stop();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});video.srcObject=stream;video.style.display='block';placeholder.style.display='none';await video.play();if(mode==='barcode'){if(!('BarcodeDetector'in window)){manual.style.display='block';toast('المتصفح لا يدعم قراءة الباركود بالكاميرا؛ أدخل الرقم يدوياً أو استخدم Chrome حديثاً.');return}detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']});scanLoop=true;const tick=async()=>{if(!scanLoop)return;try{const codes=await detector.detect(video);if(codes.length){document.getElementById('barcodeInput').value=codes[0].rawValue;findCode(codes[0].rawValue);stop();return}}catch(e){}requestAnimationFrame(tick)};tick()}}catch(e){toast('تعذّر فتح الكاميرا. اسمح للمتصفح باستخدام الكاميرا وتأكد من HTTPS.');console.warn(e)}}
 document.getElementById('startScan').onclick=startCamera;
 function histogram(img){const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});c.width=24;c.height=24;ctx.drawImage(img,0,0,24,24);const d=ctx.getImageData(0,0,24,24).data,h=new Array(24).fill(0);for(let i=0;i<d.length;i+=4){let r=d[i],g=d[i+1],b=d[i+2];if(r>245&&g>245&&b>245)continue;let k=(r>g&&r>b)?0:(g>r&&g>b)?1:(b>r&&b>g)?2:3;h[k*6+Math.min(5,Math.floor((r+g+b)/128))]++}let sum=h.reduce((a,b)=>a+b,0)||1;return h.map(x=>x/sum)}
 function distance(a,b){return a.reduce((s,x,i)=>s+Math.abs(x-b[i]),0)}
 async function photoMatch(file){results.innerHTML='<p class="note">نحلّل الصورة ونقارنها بصور المنتجات المتوفرة…</p>';const target=await createImageBitmap(file),th=histogram(target);target.close?.();let candidates=products.filter(p=>p.has_image).slice(0,160),scored=[];for(const p of candidates){try{const url=`${CFG.API_URL}/api/products/${encodeURIComponent(p.id)}/image`;const im=new Image();im.crossOrigin='anonymous';im.src=url;await im.decode();scored.push({p,score:distance(th,histogram(im))})}catch(e){}}scored.sort((a,b)=>a.score-b.score);showMatches(scored.slice(0,6).map(x=>x.p),'أقرب المنتجات بصرياً — تأكد من اختيار المنتج الصحيح');if(!scored.length)results.innerHTML='<div class="empty">لا توجد صور منتجات قابلة للمقارنة. تأكد أن صور المنتجات محفوظة في المتجر.</div>'}
 document.getElementById('takePhoto').onclick=async()=>{if(!video.videoWidth)return toast('شغّل الكاميرا أولاً');const c=document.getElementById('photoCanvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);c.toBlob(b=>photoMatch(b),'image/jpeg',.82);};
 photoFile.onchange=()=>{if(photoFile.files?.[0])photoMatch(photoFile.files[0])};
})();
