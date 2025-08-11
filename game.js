/* Mini Pizzería - Juego web sin dependencias
   Inspirado en Papa’s Pizzeria. Hecho para GitHub Pages.
*/

(() => {
  'use strict';

  // Canvas y contexto
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // UI
  const dayEl = document.getElementById('day');
  const scoreEl = document.getElementById('score');
  const customersLeftEl = document.getElementById('customersLeft');
  const queueListEl = document.getElementById('queueList');
  const orderDetailsEl = document.getElementById('orderDetails');
  const toastEl = document.getElementById('toast');

  const btnSauce = document.getElementById('btnSauce');
  const btnCheese = document.getElementById('btnCheese');
  const btnBake = document.getElementById('btnBake');
  const btnStopBake = document.getElementById('btnStopBake');
  const btnServe = document.getElementById('btnServe');
  const btnTrash = document.getElementById('btnTrash');
  const btnStartDay = document.getElementById('btnStartDay');
  const btnNextDay = document.getElementById('btnNextDay');
  const toppingButtons = Array.from(document.querySelectorAll('[data-top]'));

  // Constantes de juego
  const PIZZA_CENTER = { x: canvas.width / 2, y: canvas.height / 2 + 20 };
  const PIZZA_RADIUS = 180;
  const TOPPING_RADIUS = 10;
  const SAUCE_COLOR = '#c2410c';
  const CHEESE_COLOR = '#fbbf24';

  const TOPPINGS = {
    pepperoni: { label: 'Pepperoni', color: '#b91c1c' },
    mushroom: { label: 'Champiñón', color: '#d1d5db' },
    olive: { label: 'Aceituna', color: '#111827' }
  };

  const GAME_CONFIG = {
    baseCustomersPerDay: 3,
    patienceBase: 100,
    patienceDecayPerSec: 6, // aumenta con el día
    bakeMin: 8,
    bakeMax: 16,
    bakeToleranceBase: 3.5,
    toppingVarietyUnlock: [ 'pepperoni', 'mushroom', 'olive' ],
  };

  function getAvailableToppingsForDay(day) {
    return GAME_CONFIG.toppingVarietyUnlock.slice(0, Math.min(1 + Math.floor((day - 1) / 1.5), 3));
  }

  // Estado del juego
  const state = {
    day: 1,
    score: 0,
    customers: [],
    currentCustomer: null,
    isDayActive: false,
    selectedTopping: null,
    pizza: null,
    lastFrameTime: performance.now(),
  };

  function rng(min, max) { return Math.random() * (max - min) + min; }
  function randi(min, max) { return Math.floor(rng(min, max + 1)); }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1400);
  }

  function createOrder(day) {
    const available = getAvailableToppingsForDay(day);
    const toppingCounts = {};
    const numTypes = randi(1, Math.min(available.length, 3));
    const types = [...available].sort(() => Math.random() - 0.5).slice(0, numTypes);
    types.forEach(type => { toppingCounts[type] = randi(3, 9 + day); });

    const bakeTarget = rng(GAME_CONFIG.bakeMin, GAME_CONFIG.bakeMax) + (day - 1) * 0.4;
    const bakeTolerance = Math.max(1.2, GAME_CONFIG.bakeToleranceBase - (day - 1) * 0.25);

    return {
      toppings: toppingCounts, // {pepperoni: n, ...}
      requiresSauce: true,
      requiresCheese: true,
      bakeTarget, // segundos
      bakeTolerance,
    };
  }

  function createCustomer(id, day) {
    return {
      id,
      name: `Cliente ${id}`,
      patience: GAME_CONFIG.patienceBase,
      maxPatience: GAME_CONFIG.patienceBase,
      decayPerSec: GAME_CONFIG.patienceDecayPerSec + (day - 1) * 1.5,
      order: createOrder(day),
      state: 'waiting', // waiting | served | left
      arrivalTime: performance.now(),
    };
  }

  function resetPizza() {
    state.pizza = {
      sauce: false,
      cheese: false,
      toppings: [], // {type, x, y}
      isBaking: false,
      bakeTime: 0, // segundos acumulados
      lastBakeTick: null,
    };
  }

  function startDay() {
    state.isDayActive = true;
    const numCustomers = GAME_CONFIG.baseCustomersPerDay + state.day;
    state.customers = Array.from({ length: numCustomers }, (_, i) => createCustomer(i + 1, state.day));
    state.currentCustomer = state.customers[0] || null;
    state.selectedTopping = null;
    resetPizza();
    updateHUD();
    renderQueue();
    renderOrderDetails();
    updateToppingButtons();
    btnStartDay.style.display = 'none';
    btnNextDay.style.display = 'none';
    showToast('¡Comienza el día!');
  }

  function endDay() {
    state.isDayActive = false;
    btnNextDay.style.display = 'block';
    showToast(`Día ${state.day} terminado. Puntuación: ${state.score}`);
  }

  function nextDay() {
    state.day += 1;
    dayEl.textContent = String(state.day);
    startDay();
  }

  function updateHUD() {
    dayEl.textContent = String(state.day);
    scoreEl.textContent = String(Math.round(state.score));
    const left = (state.currentCustomer && state.currentCustomer.state === 'waiting' ? 1 : 0) +
      state.customers.filter(c => c.state === 'waiting' && c !== state.currentCustomer).length;
    customersLeftEl.textContent = String(left);
  }

  function renderQueue() {
    queueListEl.innerHTML = '';
    const inQueue = state.customers.filter(c => c !== state.currentCustomer && c.state === 'waiting');
    inQueue.forEach(c => {
      const li = document.createElement('li');
      li.className = 'queue-item';
      li.innerHTML = `<span>${c.name}</span><span class="patience">${Math.ceil(c.patience)}</span>`;
      queueListEl.appendChild(li);
    });
  }

  function renderOrderDetails() {
    if (!state.currentCustomer) {
      orderDetailsEl.innerHTML = '<p>No hay cliente activo.</p>';
      return;
    }
    const c = state.currentCustomer;
    const tops = Object.entries(c.order.toppings).map(([k, v]) => `<li>${TOPPINGS[k].label}: <strong>${v}</strong></li>`).join('');
    const html = `
      <p><strong>${c.name}</strong></p>
      <ul>${tops}</ul>
      <p>Horneado objetivo: <strong>${c.order.bakeTarget.toFixed(1)}s</strong> ± ${c.order.bakeTolerance.toFixed(1)}s</p>
      <p>Salsa: <strong>${c.order.requiresSauce ? 'Sí' : 'No'}</strong> · Queso: <strong>${c.order.requiresCheese ? 'Sí' : 'No'}</strong></p>
    `;
    orderDetailsEl.innerHTML = html;
  }

  function pickNextCustomer() {
    const next = state.customers.find(c => c.state === 'waiting' && c !== state.currentCustomer);
    state.currentCustomer = next || null;
    if (!state.currentCustomer) {
      endDay();
    } else {
      renderOrderDetails();
    }
    renderQueue();
    updateHUD();
  }

  function scorePizza(customer, pizza, serveWhenMs) {
    const o = customer.order;

    let points = 0;
    let notes = [];

    // Salsa y queso
    if (o.requiresSauce) {
      if (pizza.sauce) points += 10; else notes.push('Sin salsa');
    }
    if (o.requiresCheese) {
      if (pizza.cheese) points += 10; else notes.push('Sin queso');
    }

    // Toppings: contar por tipo
    const actualCounts = {};
    pizza.toppings.forEach(t => { actualCounts[t.type] = (actualCounts[t.type] || 0) + 1; });
    Object.keys(o.toppings).forEach(type => {
      const expected = o.toppings[type] || 0;
      const actual = actualCounts[type] || 0;
      const diff = Math.abs(expected - actual);
      const maxPoints = 20; // por tipo
      const p = Math.max(0, maxPoints - diff * 3);
      points += p;
      if (diff > 0) notes.push(`${TOPPINGS[type].label} ±${diff}`);
    });

    // Horneado: cercanía al objetivo
    const bakeError = Math.abs(pizza.bakeTime - o.bakeTarget);
    const bakePoints = Math.max(0, 30 - (bakeError / Math.max(0.2, o.bakeTolerance)) * 10);
    points += bakePoints;
    if (bakeError > o.bakeTolerance) notes.push('Horneado fuera de punto');

    // Paciencia/tip
    const elapsedSec = (serveWhenMs - customer.arrivalTime) / 1000;
    const patienceLeft = Math.max(0, customer.patience);
    const tip = patienceLeft * 0.5; // hasta 50 pts extra
    points += tip;

    return { points, notes };
  }

  function serveCurrentPizza() {
    if (!state.currentCustomer) return;
    if (!state.pizza) return;

    const c = state.currentCustomer;
    const result = scorePizza(c, state.pizza, performance.now());
    state.score += result.points;
    c.state = 'served';
    showToast(`Servido: +${Math.round(result.points)} pts${result.notes.length ? ' (' + result.notes.join(', ') + ')' : ''}`);

    resetPizza();
    pickNextCustomer();
  }

  function trashPizza() {
    if (!state.pizza) return;
    state.score = Math.max(0, state.score - 10);
    showToast('Pizza tirada (-10 pts)');
    resetPizza();
  }

  function update(dtSec) {
    // Decaimiento de paciencia del cliente actual
    if (state.isDayActive && state.currentCustomer && state.currentCustomer.state === 'waiting') {
      state.currentCustomer.patience -= state.currentCustomer.decayPerSec * dtSec;
      if (state.currentCustomer.patience <= 0) {
        // Se va
        state.currentCustomer.state = 'left';
        showToast(`${state.currentCustomer.name} se fue`);
        resetPizza();
        pickNextCustomer();
      }
    }

    // Horneado
    if (state.pizza && state.pizza.isBaking) {
      const now = performance.now();
      if (state.pizza.lastBakeTick == null) state.pizza.lastBakeTick = now;
      const delta = (now - state.pizza.lastBakeTick) / 1000;
      state.pizza.bakeTime += delta;
      state.pizza.lastBakeTick = now;
    }
  }

  function drawPizzaBase() {
    // Sombra
    ctx.save();
    ctx.translate(PIZZA_CENTER.x, PIZZA_CENTER.y + 6);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, PIZZA_RADIUS * 1.02, PIZZA_RADIUS * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Borde de la mesa
    ctx.save();
    const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grd.addColorStop(0, '#0b1020');
    grd.addColorStop(1, '#0f162a');
    ctx.fillStyle = grd;
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.restore();

    // Base de pizza
    ctx.save();
    ctx.translate(PIZZA_CENTER.x, PIZZA_CENTER.y);
    // Orilla
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(0, 0, PIZZA_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    // Masa interior
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, PIZZA_RADIUS - 20, 0, Math.PI * 2);
    ctx.fill();

    // Salsa
    if (state.pizza.sauce) {
      ctx.fillStyle = SAUCE_COLOR;
      ctx.beginPath();
      ctx.arc(0, 0, PIZZA_RADIUS - 28, 0, Math.PI * 2);
      ctx.fill();
    }
    // Queso
    if (state.pizza.cheese) {
      ctx.fillStyle = CHEESE_COLOR;
      ctx.beginPath();
      ctx.arc(0, 0, PIZZA_RADIUS - 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // Toppings
    state.pizza.toppings.forEach(t => {
      ctx.fillStyle = TOPPINGS[t.type].color;
      ctx.beginPath();
      ctx.arc(t.x - PIZZA_CENTER.x, t.y - PIZZA_CENTER.y, TOPPING_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });

    // Indicadores
    if (state.pizza.isBaking) {
      // Oscurecer por horneado
      const factor = Math.min(0.6, state.pizza.bakeTime / (GAME_CONFIG.bakeMax + 6) * 0.6);
      ctx.fillStyle = `rgba(0,0,0,${factor.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, PIZZA_RADIUS - 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawHUD() {
    // Panel de horno y progreso
    ctx.save();
    const ovenX = 40, ovenY = 40, ovenW = canvas.width - 80, ovenH = 40;
    ctx.fillStyle = '#111827';
    ctx.fillRect(ovenX, ovenY, ovenW, ovenH);
    ctx.strokeStyle = '#374151';
    ctx.strokeRect(ovenX, ovenY, ovenW, ovenH);

    // Objetivo de horneado
    if (state.currentCustomer) {
      const target = state.currentCustomer.order.bakeTarget;
      const tol = state.currentCustomer.order.bakeTolerance;
      const maxSec = GAME_CONFIG.bakeMax + (state.day - 1) * 0.4 + 6;
      const toX = (s) => ovenX + (s / maxSec) * ovenW;
      ctx.fillStyle = 'rgba(59,130,246,0.25)';
      ctx.fillRect(toX(Math.max(0, target - tol)), ovenY, Math.max(2, toX(target + tol) - toX(Math.max(0, target - tol))), ovenH);
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(toX(target), ovenY);
      ctx.lineTo(toX(target), ovenY + ovenH);
      ctx.stroke();

      // Progreso actual
      const b = state.pizza.bakeTime;
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(ovenX, ovenY, Math.max(0, Math.min(ovenW, (b / maxSec) * ovenW)), ovenH);
    }

    // Paciencia del cliente
    if (state.currentCustomer) {
      const c = state.currentCustomer;
      const px = ovenX, py = ovenY + ovenH + 10, pw = ovenW, ph = 16;
      ctx.fillStyle = '#111827';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#374151';
      ctx.strokeRect(px, py, pw, ph);
      const ratio = Math.max(0, c.patience) / c.maxPatience;
      ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#f59e0b' : '#ef4444';
      ctx.fillRect(px, py, pw * ratio, ph);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px Nunito, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${c.name}`, px + pw, py - 2);
    }

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPizzaBase();
    drawHUD();
  }

  function gameLoop(ts) {
    const dtSec = Math.min(0.05, (ts - state.lastFrameTime) / 1000);
    state.lastFrameTime = ts;
    update(dtSec);
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Interacciones
  canvas.addEventListener('click', (e) => {
    if (!state.pizza || state.pizza.isBaking) return;
    if (!state.selectedTopping) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Comprobar si dentro de la pizza
    const dx = x - PIZZA_CENTER.x;
    const dy = y - PIZZA_CENTER.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= PIZZA_RADIUS - 30) {
      state.pizza.toppings.push({ type: state.selectedTopping, x, y });
      showToast(`${TOPPINGS[state.selectedTopping].label} colocado`);
    }
  });

  toppingButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      state.selectedTopping = btn.dataset.top;
      toppingButtons.forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
    });
  });

  btnSauce.addEventListener('click', () => {
    if (!state.pizza || state.pizza.isBaking) return;
    if (!state.pizza.sauce) {
      state.pizza.sauce = true;
      showToast('Salsa añadida');
    }
  });

  btnCheese.addEventListener('click', () => {
    if (!state.pizza || state.pizza.isBaking) return;
    if (!state.pizza.cheese) {
      state.pizza.cheese = true;
      showToast('Queso añadido');
    }
  });

  btnBake.addEventListener('click', () => {
    if (!state.pizza) return;
    if (!state.pizza.isBaking) {
      state.pizza.isBaking = true;
      state.pizza.lastBakeTick = performance.now();
      showToast('Horneando...');
    }
  });

  btnStopBake.addEventListener('click', () => {
    if (!state.pizza) return;
    if (state.pizza.isBaking) {
      state.pizza.isBaking = false;
      state.pizza.lastBakeTick = null;
      showToast(`Horneado pausado (${state.pizza.bakeTime.toFixed(1)}s)`);
    }
  });

  btnServe.addEventListener('click', () => {
    if (!state.pizza) return;
    serveCurrentPizza();
  });

  btnTrash.addEventListener('click', () => {
    trashPizza();
  });

  btnStartDay.addEventListener('click', () => {
    startDay();
  });

  btnNextDay.addEventListener('click', () => {
    nextDay();
  });

  // Inicialización
  function updateToppingButtons() {
    const available = getAvailableToppingsForDay(state.day);
    toppingButtons.forEach(b => {
      const isAvailable = available.includes(b.dataset.top);
      b.disabled = !isAvailable;
      if (!isAvailable) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
        if (state.selectedTopping === b.dataset.top) state.selectedTopping = null;
      }
    });
  }

  function init() {
    resetPizza();
    renderOrderDetails();
    renderQueue();
    updateHUD();
    updateToppingButtons();
    requestAnimationFrame((t) => { state.lastFrameTime = t; requestAnimationFrame(gameLoop); });
  }

  init();
})();