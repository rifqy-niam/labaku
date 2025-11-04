// Labaku – No Chart Version (All MVP Features)
function getData(key){ return JSON.parse(localStorage.getItem(key)||'[]'); }
function setData(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
function getProfile(){ return JSON.parse(localStorage.getItem('profile')||'{}'); }
function setProfile(p){ localStorage.setItem('profile', JSON.stringify(p)); }

function navigate(page){
  document.body.classList.add('fade-out');
  setTimeout(()=>location.href=page,150);
}

function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  if(cur==='dark'){ document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','light'); showToast('Mode Terang'); }
  else { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); showToast('Mode Gelap'); }
}

(function(){
  const t = localStorage.getItem('theme');
  if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
})();

// Helpers tanggal
function isSameDay(a,b){ const da=new Date(a), db=new Date(b); return da.getFullYear()===db.getFullYear() && da.getMonth()===db.getMonth() && da.getDate()===db.getDate(); }
function isSameWeek(d){ const now=new Date(); const day=now.getDay()||7; const monday=new Date(now); monday.setHours(0,0,0,0); monday.setDate(now.getDate()-day+1); const sunday=new Date(monday); sunday.setDate(monday.getDate()+6); const x=new Date(d); return x>=monday && x<=sunday; }
function isSameMonth(d){ const x=new Date(d), n=new Date(); return x.getFullYear()===n.getFullYear() && x.getMonth()===n.getMonth(); }
function isSameYear(d){ const x=new Date(d), n=new Date(); return x.getFullYear()===n.getFullYear(); }
function formatIDR(x){ return 'Rp ' + (x||0).toLocaleString('id-ID'); }
function todayHuman(){ return new Date().toLocaleString('id-ID',{dateStyle:'full', timeStyle:'short'}); }
function nextInvoice(){ const s=new Date().toISOString().slice(0,10).replaceAll('-',''); const r = (''+Math.floor(Math.random()*999)).padStart(3,'0'); return `INV-${s}-${r}`; }

// DASHBOARD
if(document.title.includes('Dashboard')||document.title.includes('Labaku - Dashboard')){
  const profile=getProfile();
  document.getElementById('businessName').textContent = profile.businessName || 'Labaku';
  document.getElementById('businessType').textContent = profile.businessType || 'UMKM';
  document.getElementById('recapMode').textContent = 'Mode Rekap: ' + (profile.recapMode || 'Harian');

  const incomes=getData('incomes'), expenses=getData('expenses');
  const mode=(profile.recapMode||'Harian').toLowerCase();
  const inSum=incomes.filter(i=>{
    const d=i.date; if(mode==='harian') return isSameDay(d,new Date());
    if(mode==='mingguan') return isSameWeek(d);
    if(mode==='bulanan') return isSameMonth(d);
    if(mode==='tahunan') return isSameYear(d);
    return true;
  }).reduce((a,i)=>a+(i.total||0),0);

  const exSum=expenses.filter(e=>{
    const d=e.date; if(mode==='harian') return isSameDay(d,new Date());
    if(mode==='mingguan') return isSameWeek(d);
    if(mode==='bulanan') return isSameMonth(d);
    if(mode==='tahunan') return isSameYear(d);
    return true;
  }).reduce((a,e)=>a+(e.amount||0),0);

  document.getElementById('income-total').textContent = formatIDR(inSum);
  document.getElementById('expense-total').textContent = formatIDR(exSum);
  document.getElementById('profit-total').textContent = formatIDR(inSum-exSum);
}

// INCOME
if(document.title.includes('Pemasukan')){
  document.getElementById('incomeDate').textContent = todayHuman();
  const invoicePrev=document.getElementById('invoicePrev'); invoicePrev.textContent = nextInvoice();

  const form=document.getElementById('incomeForm');
  const qty=document.getElementById('qty');
  const price=document.getElementById('unitPrice');
  const discount=document.getElementById('discount');
  const tax=document.getElementById('tax');
  const totalPrev=document.getElementById('totalPrev');

  function recalc(){
    const t=(Number(qty.value||0)*Number(price.value||0))-Number(discount.value||0)+Number(tax.value||0);
    totalPrev.textContent = formatIDR(t);
  }
  [qty,price,discount,tax].forEach(el=>el.addEventListener('input',recalc)); recalc();

  function refreshTodaySummary(){
    const incomes=getData('incomes');
    const today=incomes.filter(i=>isSameDay(i.date,new Date()));
    const incomeToday=today.reduce((a,i)=>a+(i.total||0),0);
    const dis=today.reduce((a,i)=>a+(i.discount||0),0);
    const tx=today.reduce((a,i)=>a+(i.tax||0),0);
    document.getElementById('incomeToday').textContent = formatIDR(incomeToday);
    document.getElementById('discountToday').textContent = formatIDR(dis);
    document.getElementById('taxToday').textContent = formatIDR(tx);
  }
  refreshTodaySummary();

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const prod=document.getElementById('prodName').value.trim();
    const q=Number(qty.value||0), p=Number(price.value||0);
    const d=Number(discount.value||0), t=Number(tax.value||0);
    const total=(q*p)-d+t;
    const inv=invoicePrev.textContent;

    const incomes=getData('incomes');
    incomes.push({date:new Date(), product:prod, qty:q, price:p, discount:d, tax:t, total, invoice:inv});
    setData('incomes', incomes);
    showToast('Pemasukan disimpan');
    invoicePrev.textContent = nextInvoice();
    form.reset(); recalc(); refreshTodaySummary();
  });
}

// EXPENSE
if(document.title.includes('Pengeluaran')){
  document.getElementById('currentDate').textContent = todayHuman();
  const form=document.getElementById('expenseForm');
  function refreshCategorySummary(){
    const ex=getData('expenses').filter(e=>isSameDay(e.date,new Date()));
    const bahan=ex.filter(e=>e.category==='Bahan Baku').reduce((a,e)=>a+e.amount,0);
    const tenaga=ex.filter(e=>e.category==='Tenaga Kerja').reduce((a,e)=>a+e.amount,0);
    const oper=ex.filter(e=>e.category==='Operasional').reduce((a,e)=>a+e.amount,0);
    document.getElementById('totalBahan').textContent = formatIDR(bahan);
    document.getElementById('totalTenaga').textContent = formatIDR(tenaga);
    document.getElementById('totalOperasional').textContent = formatIDR(oper);
  }
  refreshCategorySummary();
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const desc=document.getElementById('expDesc').value.trim();
    const amount=Number(document.getElementById('expAmount').value||0);
    const cat=document.getElementById('expCat').value;
    const arr=getData('expenses'); arr.push({date:new Date(), desc, amount, category:cat});
    setData('expenses', arr);
    showToast('Pengeluaran disimpan');
    form.reset(); refreshCategorySummary();
  });
}

// REPORT
if(document.title.includes('Rekap Keuangan')){
  const select=document.getElementById('filterMode');
  const listIn=document.getElementById('listIncomes');
  const listEx=document.getElementById('listExpenses');
  const sumIn=document.getElementById('sumIncome');
  const sumEx=document.getElementById('sumExpense');
  const sumPr=document.getElementById('sumProfit');

  function inFilter(d,mode){
    if(mode==='Harian') return isSameDay(d,new Date());
    if(mode==='Mingguan') return isSameWeek(d);
    if(mode==='Bulanan') return isSameMonth(d);
    if(mode==='Tahunan') return isSameYear(d);
    return true;
  }

  function render(){
    const mode=select.value;
    const incomes=getData('incomes').filter(i=>inFilter(i.date,mode));
    const expenses=getData('expenses').filter(e=>inFilter(e.date,mode));

    const inSum=incomes.reduce((a,i)=>a+(i.total||0),0);
    const exSum=expenses.reduce((a,e)=>a+(e.amount||0),0);
    sumIn.textContent = formatIDR(inSum);
    sumEx.textContent = formatIDR(exSum);
    sumPr.textContent = formatIDR(inSum-exSum);

    listIn.innerHTML = '<div class="list"></div>';
    const inBox=listIn.firstChild;
    incomes.forEach(i=>{
      const row=document.createElement('div');
      row.className='list-item';
      row.innerHTML = `<div><span class="badge">Nota</span> ${i.invoice} — ${i.product}</div><div>${formatIDR(i.total)}</div>`;
      inBox.appendChild(row);
    });
    if(!incomes.length){ inBox.innerHTML = '<div class="list-item"><div>Tidak ada pemasukan</div><div>-</div></div>'; }

    listEx.innerHTML = '<div class="list" style="margin-top:8px;"></div>';
    const exBox=listEx.firstChild;
    expenses.forEach(e=>{
      const row=document.createElement('div');
      row.className='list-item';
      row.innerHTML = `<div><span class="badge">${e.category}</span> ${e.desc}</div><div>${formatIDR(e.amount)}</div>`;
      exBox.appendChild(row);
    });
    if(!expenses.length){ exBox.innerHTML = '<div class="list-item"><div>Tidak ada pengeluaran</div><div>-</div></div>'; }
  }

  select.addEventListener('change', render);
  render();

  document.getElementById('exportCSV').addEventListener('click', ()=>{
    const incomes=getData('incomes');
    const expenses=getData('expenses');
    const head='TYPE,DATE,INFO,AMOUNT\n';
    const rowsIn=incomes.map(i=>`INCOME,${new Date(i.date).toISOString()},${i.invoice} ${i.product},${i.total}`);
    const rowsEx=expenses.map(e=>`EXPENSE,${new Date(e.date).toISOString()},${e.category} ${e.desc},${e.amount}`);
    const csv=head + rowsIn.concat(rowsEx).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='rekap_labaku.csv'; a.click();
    showToast('CSV diekspor');
  });
}

// PROFILE
if(document.title.includes('Profil Usaha')){
  const form=document.getElementById('profileForm');
  const p=getProfile();
  document.getElementById('bizName').value = p.businessName||'';
  document.getElementById('ownerName').value = p.ownerName||'';
  document.getElementById('bizType').value = p.businessType||'';
  document.getElementById('recapModeSelect').value = p.recapMode||'Harian';
  document.getElementById('defaultDiscount').value = (p.defaultDiscount??0);
  document.getElementById('defaultTax').value = (p.defaultTax??11);

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const profile={
      businessName: document.getElementById('bizName').value.trim() || 'Labaku',
      ownerName: document.getElementById('ownerName').value.trim() || '',
      businessType: document.getElementById('bizType').value.trim() || 'UMKM',
      recapMode: document.getElementById('recapModeSelect').value,
      defaultDiscount: Number(document.getElementById('defaultDiscount').value||0),
      defaultTax: Number(document.getElementById('defaultTax').value||11),
    };
    setProfile(profile);
    showToast('Profil disimpan');
  });
}

// Toast + transition
function showToast(msg){
  const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  setTimeout(()=>t.classList.add('show'), 10);
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),250); }, 2200);
}
window.addEventListener('pageshow', ()=>document.body.classList.remove('fade-out'));
