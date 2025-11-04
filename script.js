// Labaku App Logic – localStorage, charts, UI, theme
// Default theme: light (no data-theme). Toggle in Profile.

// Helpers
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const LS = {
  get: (k, d=null) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  push: (k, v) => { const arr = LS.get(k, []); arr.push(v); LS.set(k, arr); return arr; }
};

const todayStr = () => new Date().toISOString().slice(0,10);

// Theme init
(function initTheme(){
  const savedTheme = LS.get('theme', 'light');
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

function toggleTheme() {
  const nowDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (nowDark) {
    document.documentElement.removeAttribute('data-theme');
    LS.set('theme','light');
    toast('Mode Terang Aktif');
  } else {
    document.documentElement.setAttribute('data-theme','dark');
    LS.set('theme','dark');
    toast('Mode Gelap Aktif');
  }
}

function navigate(page){ document.body.classList.add('fade-out'); setTimeout(()=>location.href=page,180); }

function toast(msg){
  const t = document.createElement('div'); t.className='toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(()=>t.classList.add('show'), 10);
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(), 300); }, 2400);
}
window.addEventListener('pageshow', ()=> document.body.classList.remove('fade-out'));

// Profile defaults
function getProfile(){
  return LS.get('profile', {
    businessName: 'Nama Usaha',
    businessType: 'Jenis Usaha',
    recapMode: 'Harian',
    defaultDiscountPct: 0,
    defaultTaxPct: 11
  });
}
function setProfile(p){ LS.set('profile', p); }

// Invoice generator per hari
function nextInvoice(){
  const day = todayStr();
  const key = 'invCounter-' + day;
  const n = (LS.get(key, 0) || 0) + 1;
  LS.set(key, n);
  const seq = String(n).padStart(3,'0');
  return `INV-${day.replaceAll('-','')}-${seq}`;
}

// Sum utilities
function sumIncome(filterFn = () => true){
  const list = LS.get('incomes', []);
  return list.filter(filterFn).reduce((a,i)=> a + i.total, 0);
}
function sumExpense(filterFn = () => true){
  const list = LS.get('expenses', []);
  return list.filter(filterFn).reduce((a,e)=> a + e.amount, 0);
}

// ========= Dashboard (index.html) =========
if (document.title.includes('Dashboard')) {
  const profile = getProfile();
  $('#businessName').textContent = profile.businessName;
  $('#businessType').textContent = profile.businessType;
  $('#recapMode').textContent = 'Mode Rekap: ' + profile.recapMode;

  // Period handling: for MVP, show totals overall (or today if recapMode Harian)
  const mode = profile.recapMode;
  const dateNow = new Date();
  const start = new Date(dateNow);
  if (mode === 'Harian') start.setHours(0,0,0,0);
  if (mode === 'Mingguan') { const d=dateNow.getDay(); start.setDate(dateNow.getDate()-((d+6)%7)); start.setHours(0,0,0,0); }
  if (mode === 'Bulanan') { start.setDate(1); start.setHours(0,0,0,0); }
  if (mode === 'Tahunan') { start.setMonth(0,1); start.setHours(0,0,0,0); }
  const startISO = start.toISOString();

  const incomeTotal = sumIncome(i=> new Date(i.date) >= new Date(startISO));
  const expenseTotal = sumExpense(e=> new Date(e.date) >= new Date(startISO));
  const profit = incomeTotal - expenseTotal;

  $('#income-total').textContent = 'Rp ' + incomeTotal.toLocaleString('id-ID');
  $('#expense-total').textContent = 'Rp ' + expenseTotal.toLocaleString('id-ID');
  $('#profit-total').textContent = 'Rp ' + profit.toLocaleString('id-ID');

  // Chart 7-day (income, expense, profit)
  const labels = [];
  const incData = [], expData = [], prfData = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    labels.push(key.slice(5));
    const inc = sumIncome(x=> x.date.slice(0,10) === key);
    const exp = sumExpense(x=> x.date.slice(0,10) === key);
    incData.push(inc); expData.push(exp); prfData.push(inc-exp);
  }
  const ctx = document.getElementById('financeChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [
      { label:'Pemasukan', data:incData, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--income').trim(), tension:.35 },
      { label:'Pengeluaran', data:expData, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--expense').trim(), tension:.35 },
      { label:'Laba', data:prfData, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--profit').trim(), tension:.35 }
    ]},
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{ x:{ ticks:{ color:getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() } },
               y:{ ticks:{ color:getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() } } }
    }
  });
}

// ========= Income (income.html) =========
if (document.title.includes('Pemasukan')) {
  const form = $('#incomeForm');
  const profile = getProfile();
  $('#inInvoice').value = nextInvoice();

  const inputs = {
    product: $('#inProduct'),
    qty: $('#inQty'),
    price: $('#inPrice'),
    discount: $('#inDiscount'),
    tax: $('#inTax'),
    total: $('#inTotal')
  };

  // Prefill defaults
  inputs.discount.value = Math.round((profile.defaultDiscountPct || 0) / 100 * (Number(inputs.qty.value||0) * Number(inputs.price.value||0)));
  inputs.tax.value = 0; // user can enter nominal tax; default based on profile used on save

  function recalc(){
    const qty = Number(inputs.qty.value||0);
    const price = Number(inputs.price.value||0);
    let discount = Number(inputs.discount.value||0);
    let tax = Number(inputs.tax.value||0);
    const subtotal = qty * price;
    const total = subtotal - discount + tax;
    inputs.total.textContent = 'Rp ' + (isFinite(total)? total:0).toLocaleString('id-ID');
  }
  ['input','change'].forEach(ev=> form.addEventListener(ev, recalc));
  recalc();

  function refreshHeaderTotals(){
    const today = todayStr();
    const incomes = LS.get('incomes', []);
    const todayList = incomes.filter(i=> i.date.slice(0,10)===today);
    const sum = todayList.reduce((a,i)=> a + i.total, 0);
    const sumDisc = todayList.reduce((a,i)=> a + i.discount, 0);
    const sumTax = todayList.reduce((a,i)=> a + i.tax, 0);
    $('#incomeToday').textContent = 'Rp ' + sum.toLocaleString('id-ID');
    $('#discountToday').textContent = 'Rp ' + sumDisc.toLocaleString('id-ID');
    $('#taxToday').textContent = 'Rp ' + sumTax.toLocaleString('id-ID');
  }
  refreshHeaderTotals();

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const qty = Number(inputs.qty.value||0);
    const price = Number(inputs.price.value||0);
    let discount = Number(inputs.discount.value||0);
    let tax = Number(inputs.tax.value||0);

    // If tax not provided, apply defaultTaxPct
    if (!tax && (profile.defaultTaxPct||0) > 0) {
      tax = Math.round((profile.defaultTaxPct/100) * (qty*price - discount));
    }

    const total = qty*price - discount + tax;
    const data = {
      date: new Date().toISOString(),
      invoice: $('#inInvoice').value,
      product: inputs.product.value.trim(),
      qty, price, discount, tax, total
    };
    LS.push('incomes', data);
    toast('Pemasukan berhasil disimpan');
    form.reset();
    $('#inInvoice').value = nextInvoice();
    recalc();
    refreshHeaderTotals();
  });
}

// ========= Expense (expense.html) =========
if (document.title.includes('Pengeluaran')) {
  $('#currentDate').value = new Date().toLocaleString('id-ID');
  const form = $('#expenseForm');

  function refreshCatTotals(){
    const today = todayStr();
    const list = LS.get('expenses', []);
    const bb = list.filter(x=> x.category==='Bahan Baku' && x.date.slice(0,10)===today).reduce((a,b)=>a+b.amount,0);
    const tk = list.filter(x=> x.category==='Tenaga Kerja' && x.date.slice(0,10)===today).reduce((a,b)=>a+b.amount,0);
    const op = list.filter(x=> x.category==='Operasional' && x.date.slice(0,10)===today).reduce((a,b)=>a+b.amount,0);
    $('#totalBahan').textContent = 'Rp ' + bb.toLocaleString('id-ID');
    $('#totalTenaga').textContent = 'Rp ' + tk.toLocaleString('id-ID');
    $('#totalOperasional').textContent = 'Rp ' + op.toLocaleString('id-ID');
  }
  refreshCatTotals();

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const payload = {
      date: new Date().toISOString(),
      desc: $('#exDesc').value.trim(),
      amount: Number($('#exAmount').value||0),
      category: $('#exCategory').value
    };
    LS.push('expenses', payload);
    toast('Pengeluaran tersimpan');
    form.reset();
    $('#currentDate').value = new Date().toLocaleString('id-ID');
    refreshCatTotals();
  });
}

// ========= Report (report.html) =========
if (document.title.includes('Rekap')) {
  const filterMode = $('#filterMode');
  const filterProduct = $('#filterProduct');
  const listEl = $('#reportList');
  const ctx = $('#reportChart').getContext('2d');

  function rangeStart(mode){
    const now = new Date();
    const s = new Date(now);
    if (mode==='Harian') s.setHours(0,0,0,0);
    else if (mode==='Mingguan'){ const d=now.getDay(); s.setDate(now.getDate()-((d+6)%7)); s.setHours(0,0,0,0); }
    else if (mode==='Bulanan'){ s.setDate(1); s.setHours(0,0,0,0); }
    else if (mode==='Tahunan'){ s.setMonth(0,1); s.setHours(0,0,0,0); }
    return s;
  }

  let chart;
  function render(){
    const mode = filterMode.value;
    const start = rangeStart(mode);
    const incomes = LS.get('incomes', []).filter(i=> new Date(i.date)>=start && (!filterProduct.value || i.product.toLowerCase().includes(filterProduct.value.toLowerCase())));
    const expenses = LS.get('expenses', []).filter(e=> new Date(e.date)>=start);

    const sInc = incomes.reduce((a,i)=>a+i.total,0);
    const sExp = expenses.reduce((a,e)=>a+e.amount,0);
    const sPrf = sInc - sExp;
    $('#sumIncome').textContent = 'Rp ' + sInc.toLocaleString('id-ID');
    $('#sumExpense').textContent = 'Rp ' + sExp.toLocaleString('id-ID');
    $('#sumProfit').textContent = 'Rp ' + sPrf.toLocaleString('id-ID');

    // Table
    listEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'list';
    incomes.forEach(i=> {
      const row = document.createElement('div'); row.className='rowline';
      row.textContent = `${i.invoice} • ${i.product} • Rp ${i.total.toLocaleString('id-ID')} • ${new Date(i.date).toLocaleString('id-ID')}`;
      wrap.appendChild(row);
    });
    expenses.forEach(e=> {
      const row = document.createElement('div'); row.className='rowline muted';
      row.textContent = `${e.category} • ${e.desc} • Rp ${e.amount.toLocaleString('id-ID')} • ${new Date(e.date).toLocaleString('id-ID')}`;
      wrap.appendChild(row);
    });
    listEl.appendChild(wrap);

    // Chart (profit)
    const labels = [], profitData=[];
    for (let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10);
      const inc = sumIncome(x=> x.date.slice(0,10)===key);
      const exp = sumExpense(x=> x.date.slice(0,10)===key);
      labels.push(key.slice(5));
      profitData.push(inc-exp);
    }
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type:'line',
      data:{ labels, datasets:[ { label:'Laba', data:profitData, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--profit').trim(), tension:.35 } ] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } }
    });
  }

  render();
  filterMode.addEventListener('change', render);
  filterProduct.addEventListener('input', render);

  $('#exportCSV').addEventListener('click', ()=>{
    const inc = LS.get('incomes', []);
    const exp = LS.get('expenses', []);
    let csv = 'type,date,invoice/product,desc,qty,unitPrice,discount,tax,amount/total\n';
    inc.forEach(i=> csv += `income,${i.date},${i.invoice},${i.product},${i.qty},${i.price},${i.discount},${i.tax},${i.total}\n`);
    exp.forEach(e=> csv += `expense,${e.date},,${e.desc},,,,${e.amount}\n`);
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rekap_labaku.csv';
    a.click();
    toast('File CSV berhasil diekspor');
  });
}

// ========= Profile (profile.html) =========
if (document.title.includes('Profil Usaha')) {
  const form = $('#profileForm');
  const p = getProfile();
  $('#bizName').value = p.businessName;
  $('#ownerName').value = p.ownerName || '';
  $('#bizType').value = p.businessType;
  $('#recapModeSelect').value = p.recapMode;
  $('#defaultDiscount').value = p.defaultDiscountPct;
  $('#defaultTax').value = p.defaultTaxPct;

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const np = {
      businessName: $('#bizName').value.trim() || 'Nama Usaha',
      businessType: $('#bizType').value.trim() || 'Jenis Usaha',
      recapMode: $('#recapModeSelect').value,
      defaultDiscountPct: Number($('#defaultDiscount').value||0),
      defaultTaxPct: Number($('#defaultTax').value||0),
      ownerName: $('#ownerName').value.trim()
    };
    setProfile(np);
    toast('Profil tersimpan');
  });
}
