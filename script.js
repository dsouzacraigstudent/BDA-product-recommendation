import { products, users, categoryColors, PURCHASE_CHANCE, MIN_SUPPORT_COUNT, MIN_CONFIDENCE } from './data.js';

// --- 2. SIMULATION STATE & CONFIGURATION ---
let state = {};
let simulationInterval;
let simulationSpeed = 1000;

// --- DOM ELEMENT REFERENCES ---
const startBtn = document.getElementById('start-simulation-btn');
const pauseBtn = document.getElementById('pause-simulation-btn');
const speedSlider = document.getElementById('speed-slider');
const productSearch = document.getElementById('product-search');
const exportBtn = document.getElementById('export-rules-btn');
const recCount = document.getElementById('rec-count');
const usersContainer = document.getElementById('users-container');
const recommendationsContainer = document.getElementById('recommendations-container');
const logContainer = document.getElementById('log-container');
const graphContainer = document.getElementById('graph-container');
const metricPurchases = document.getElementById('metric-purchases');
const metricEvents = document.getElementById('metric-events');
const metricAssociations = document.getElementById('metric-associations');
const rulesTable = document.getElementById('rules-table');
const categoryChartContainer = document.getElementById('category-chart-container');
const liftChartContainer = document.getElementById('lift-chart-container');
const scatterPlotContainer = document.getElementById('scatter-plot-container');
const tooltip = d3.select('.tooltip');

let totalRecommendations = 0;
let isPaused = false;
let currentSort = { column: 'lift', direction: 'desc' };
let hoveredNode = null;

// --- D3 GRAPH SETUP ---
let d3Sim, svg, link, node, linkText;

function initGraph() {
    graphContainer.innerHTML = '';
    const width = graphContainer.clientWidth;
    const height = graphContainer.clientHeight > 450 ? graphContainer.clientHeight : 450;
    svg = d3.select("#graph-container").append("svg").attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height]);
    
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 10) 
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('xoverflow', 'visible')
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', '#94a3b8')
        .style('stroke', 'none');

    const categoryCenters = {};
    const categories = Array.from(new Set(products.map(p => p.category)));
    categories.forEach((cat, i) => {
        const angle = (i / categories.length) * 2 * Math.PI;
        categoryCenters[cat] = {
            x: width / 2 + (width / 3.5) * Math.cos(angle),
            y: height / 2 + (height / 3.5) * Math.sin(angle)
        };
    });

    d3Sim = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(150).strength(0.5))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(d => categoryCenters[d.category].x).strength(0.2))
        .force("y", d3.forceY(d => categoryCenters[d.category].y).strength(0.2))
        .force("collide", d3.forceCollide(d => d.radius + 4).strength(1));

    node = svg.append("g").selectAll("g");
    link = svg.append("g").selectAll("path");
    linkText = svg.append("g").selectAll("text.link-label");
    
    updateGraph(true); // Initial graph draw
}
        
function updateGraph(isInitial = false) {
    if (!state.associationRules) return;

    const purchaseCounts = {};
    state.purchases.flat().forEach(id => purchaseCounts[id] = (purchaseCounts[id] || 0) + 1);
    const radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(Object.values(purchaseCounts)) || 1])
        .range([15, 35]);

    const graphNodes = products.map(p => ({...p, radius: radiusScale(purchaseCounts[p.id] || 0)}));
    const ruleLinks = state.associationRules.map(r => ({
        source: r.antecedent[0], 
        target: r.consequent[0], 
        ...r
    }));
    
    node = node.data(graphNodes, d => d.id);
    node.exit().remove();
    const nodeEnter = node.enter().append("g").attr("class", "node").call(drag(d3Sim));
    nodeEnter.append("circle").attr("fill", d => categoryColors[d.category]);
    nodeEnter.append("text").attr('text-anchor', 'middle').attr('dominant-baseline', 'central');
    node = nodeEnter.merge(node);
    
    if (isInitial) {
        node.select('circle').attr("r", d => d.radius);
    } else {
        // Reduce animation: direct update without transition for faster response
        node.select('circle').attr("r", d => d.radius);
    }
    node.select('text').text(d => d.image).style('font-size', d => `${d.radius}px`);


    const linkedByIndex = {};
    ruleLinks.forEach(d => { linkedByIndex[`${d.source},${d.target}`] = 1; });
    const isConnected = (a, b) => linkedByIndex[`${a.id},${b.id}`] || linkedByIndex[`${b.id},${a.id}`] || a.id === b.id;

    node.on('mouseover', (event, d) => {
        hoveredNode = d;
        tooltip.transition().duration(200).style('opacity', .9);
        
        const totalAssociations = state.associationRules.filter(r => r.antecedent[0] == d.id || r.consequent[0] == d.id).length;
        const outgoingRules = state.associationRules
            .filter(r => r.antecedent[0] == d.id)
            .sort((a,b) => b.lift - a.lift)
            .slice(0, 3);
        
        const incomingRules = state.associationRules
            .filter(r => r.consequent[0] == d.id)
            .sort((a,b) => b.lift - a.lift)
            .slice(0, 3);

        let outgoingHtml = outgoingRules.length > 0 ? '<strong>Leads to buying:</strong><ul class="text-left">' + outgoingRules.map(r => { const p = getProductById(r.consequent[0]); return p ? `<li>${p.image} ${p.name} (Lift: ${r.lift.toFixed(2)}, Conf: ${(r.confidence * 100).toFixed(1)}%)</li>` : ''}).join('') + '</ul>' : '<p class="text-gray-400">No outgoing associations</p>';
        let incomingHtml = incomingRules.length > 0 ? '<strong>Bought after:</strong><ul class="text-left">' + incomingRules.map(r => { const p = getProductById(r.antecedent[0]); return p ? `<li>${p.image} ${p.name} (Lift: ${r.lift.toFixed(2)}, Conf: ${(r.confidence * 100).toFixed(1)}%)</li>` : ''}).join('') + '</ul>' : '<p class="text-gray-400">No incoming associations</p>';


        tooltip.html(`
            <div class="p-2 max-w-md text-left bg-white border rounded-lg shadow-lg">
                <div class="text-center mb-2">
                    <span class="text-2xl mb-1 block">${d.image}</span>
                    <p class="font-bold text-base">${d.name}</p>
                    <p class="text-sm text-gray-500">Category: ${d.category}</p>
                </div>
                <p class="text-sm text-gray-600 mb-2">Purchased: ${purchaseCounts[d.id] || 0} times</p>
                <p class="text-sm text-gray-600 mb-3">Total Associations: ${totalAssociations}</p>
                ${outgoingHtml}
                ${incomingHtml}
            </div>
        `).style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 28) + 'px');

        // Highlight outgoing associations
        const outgoingLinks = ruleLinks.filter(l => l.source === d.id);
        const connectedNodeIds = new Set([d.id]);
        outgoingLinks.forEach(l => connectedNodeIds.add(l.target));

        node.style('opacity', nd => connectedNodeIds.has(nd.id) ? 1 : 0.1);
        link.style('opacity', l => outgoingLinks.some(ol => ol.source === l.source && ol.target === l.target) ? 1 : 0.1);
        linkText.style('opacity', lt => outgoingLinks.some(ol => ol.source === lt.source && ol.target === lt.target) ? 1 : 0.1);
    }).on('mouseout', () => {
        tooltip.transition().duration(500).style('opacity', 0);
        if (hoveredNode) {
            node.style('opacity', 1);
            link.style('opacity', 1);
            linkText.style('opacity', 1);
            hoveredNode = null;
        }
    });

    link = link.data(ruleLinks, d => `${d.source}-${d.target}`);
    link.exit().remove();
    link = link.enter().append("path").attr("class", "link").attr("marker-end", "url(#arrowhead)").merge(link);
    link.style("stroke-width", d => 1 + (d.confidence - MIN_CONFIDENCE) * 6);
    
    link.on('mouseover', (event, d) => {
        tooltip.transition().duration(200).style('opacity', .9);
        tooltip.html(`<strong>Rule Details</strong><br>Support: ${d.support.toFixed(3)}<br>Confidence: ${d.confidence.toFixed(3)}<br>Lift: ${d.lift.toFixed(2)}`)
               .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 28) + 'px');
    }).on('mouseout', () => {
        tooltip.transition().duration(500).style('opacity', 0);
    });

    linkText = linkText.data(ruleLinks, d => `${d.source}-${d.target}`);
    linkText.exit().remove();
    linkText = linkText.enter().append("text")
        .attr('class', 'link-label')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .text(d => `Lift: ${d.lift.toFixed(2)}`)
        .merge(linkText);

    // Ensure all nodes are visible by default and no fade on hover
    node.style('opacity', 1);
    link.style('opacity', 1);
    linkText.style('opacity', 1);

    d3Sim.nodes(graphNodes).on("tick", ticked);
    d3Sim.force("link").links(ruleLinks);
    // Reduce animation: higher alpha decay for faster settling, lower alpha for less movement
    d3Sim.alphaDecay(0.05).alpha(0.3).restart();
}

function ticked() {
    link.attr('d', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        if (dr === 0) return `M0,0L0,0`; 
        const offsetX = (dx * d.target.radius) / dr;
        const offsetY = (dy * d.target.radius) / dr;
        return `M${d.source.x},${d.source.y}L${d.target.x - offsetX},${d.target.y - offsetY}`;
    });

    linkText
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
}
        
function drag(simulation) {
  function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
  function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
  function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
  return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
}

// --- HELPERS & UI ---
const getProductById = (id) => products.find(p => p.id == id);
function logMessage(message, color = 'text-gray-400') {
     const p = document.createElement('div');
     p.className = `log-item ${color}`;
     p.innerHTML = `<span class="mr-2">${new Date().toLocaleTimeString()}</span> ${message}`;
     logContainer.prepend(p);
}
function updateMetrics() {
    metricEvents.textContent = state.totalEvents;
    metricPurchases.textContent = state.totalPurchases;
    metricAssociations.textContent = state.associationRules.length;
}
function initializeState() {
     state = {
        carts: users.reduce((acc, user) => ({ ...acc, [user.id]: new Set() }), {}),
        purchases: [],
        associationRules: [],
        totalPurchases: 0,
        totalEvents: 0
    };
}

function getUserAvatar(name) {
    const hash = name.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    const emojis = ['👤', '🧑', '👨', '👩', '🧔', '👱', '🧓', '👦', '👧'];
    return emojis[Math.abs(hash) % emojis.length];
}

function renderInitialState() {
    usersContainer.innerHTML = '';
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.id = `user-card-${user.id}`;
        userCard.className = 'card p-4 fade-in';
        userCard.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${getUserAvatar(user.name)}</span>
                    <h3 class="text-lg font-bold">${user.name}</h3>
                </div>
                <div class="flex flex-wrap gap-1 justify-end">${user.prefs.map(p => `<span class="text-xs font-semibold px-2 py-1 rounded-full" style="background-color:${categoryColors[p]}20; color:${categoryColors[p]}">${p}</span>`).join('')}</div>
            </div>
            <p class="text-sm font-semibold mb-1">Cart:</p>
            <div id="cart-${user.id}" class="min-h-[30px] text-gray-600 text-sm flex flex-wrap gap-2 border p-2 rounded-md bg-gray-50">
                <span class="italic text-gray-400">Empty</span>
            </div>
        `;
        usersContainer.appendChild(userCard);
    });
}
        
function updateCartUI(userId) {
    const cartDiv = document.getElementById(`cart-${userId}`);
    const cartItems = Array.from(state.carts[userId]);
    cartDiv.innerHTML = cartItems.length > 0 ? '' : '<span class="italic text-gray-400">Empty</span>';
    cartItems.forEach(itemId => {
        const product = getProductById(itemId);
        if (!product) return;
        const productSpan = document.createElement('span');
        productSpan.className = 'fade-in bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium';
        productSpan.textContent = `${product.image} ${product.name}`;
        cartDiv.appendChild(productSpan);
    });
}
        
function renderRecommendation(userId, reasonProductId, recommendedProducts) {
    if (recommendedProducts.length === 0) return;
    const user = users.find(u => u.id === userId);
    const reasonProduct = getProductById(reasonProductId);
    if (!user || !reasonProduct) return;

    totalRecommendations++;
    recCount.textContent = totalRecommendations;

    // Pulse notification bell if present
    const bell = document.querySelector('.notification-bell');
    if (bell) {
        bell.classList.add('pulse');
        setTimeout(() => bell.classList.remove('pulse'), 2000);
    }

    const cardId = `rec-card-${userId}-${Date.now()}`;
    const recommendationCard = document.createElement('div');
    recommendationCard.id = cardId;
    recommendationCard.className = 'card p-4 fade-in highlight-recommendation border-l-4 border-indigo-500';
    recommendationCard.innerHTML = `
        <p class="font-bold text-indigo-700">💡 For ${user.name}:</p>
        <p class="text-sm text-gray-600 mb-3">Because you bought <span class="font-semibold">${reasonProduct.image} ${reasonProduct.name}</span>...</p>
        <ul class="space-y-2">
            ${recommendedProducts.map(rec => {
                if (!rec.product) return '';
                return `<li class="flex items-center justify-between p-2 bg-gray-100 rounded">
                   <div class="flex items-center gap-3">
                     <span class="text-2xl">${rec.product.image}</span>
                     <span class="font-medium">${rec.product.name}</span>
                   </div>
                   <span class="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">${(rec.confidence * 100).toFixed(0)}%</span>
                </li>`
            }).join('')}
        </ul>
    `;
    if (recommendationsContainer.children.length > 0 && recommendationsContainer.children[0].classList.contains('text-gray-500')) {
        recommendationsContainer.innerHTML = '';
    }
    recommendationsContainer.prepend(recommendationCard);
    setTimeout(() => {
        const card = document.getElementById(cardId);
        if (card) { card.style.transition = 'opacity 0.5s'; card.style.opacity = '0'; setTimeout(() => card.remove(), 500); }
    }, 8000);
}
        
function renderRules(rules) {
    if (rules.length === 0) {
        rulesTable.innerHTML = `<p class="text-gray-500 text-center italic mt-4">No strong association rules found yet.</p>`;
        return;
    }
    const sortedRules = sortRules(rules, currentSort.column, currentSort.direction);
    const tableHTML = `
        <table class="w-full text-left text-sm">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-2 rounded-tl-lg cursor-pointer hover:bg-gray-200" onclick="sortTable('rule')">Rule</th>
                    <th class="p-2 cursor-pointer hover:bg-gray-200" onclick="sortTable('support')">Support</th>
                    <th class="p-2 cursor-pointer hover:bg-gray-200" onclick="sortTable('confidence')">Confidence</th>
                    <th class="p-2 cursor-pointer hover:bg-gray-200" onclick="sortTable('lift')">Lift</th>
                    <th class="p-2 rounded-tr-lg cursor-pointer hover:bg-gray-200" onclick="sortTable('conviction')">Conviction</th>
                </tr>
            </thead>
            <tbody>
                ${sortedRules.map(rule => {
                    const antecedentProduct = getProductById(rule.antecedent[0]);
                    const consequentProduct = getProductById(rule.consequent[0]);
                    if (!antecedentProduct || !consequentProduct) return '';
                    return `<tr class="border-b last:border-b-0 hover:bg-gray-50">
                        <td class="p-2 font-semibold">${antecedentProduct.image} ${antecedentProduct.name.slice(0,20)}... → ${consequentProduct.image} ${consequentProduct.name.slice(0,20)}...</td>
                        <td class="p-2">${rule.support.toFixed(3)}</td>
                        <td class="p-2">${(rule.confidence * 100).toFixed(1)}%</td>
                        <td class="p-2 font-bold ${rule.lift > 1 ? 'text-green-600' : 'text-red-600'}">${rule.lift.toFixed(2)}</td>
                        <td class="p-2">${rule.conviction.toFixed(2)}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    `;
    rulesTable.innerHTML = tableHTML;
}

function sortRules(rules, column, direction) {
    return [...rules].sort((a, b) => {
        let valA, valB;
        switch (column) {
            case 'rule': valA = `${getProductById(a.antecedent[0])?.name}-${getProductById(a.consequent[0])?.name}`; valB = `${getProductById(b.antecedent[0])?.name}-${getProductById(b.consequent[0])?.name}`; break;
            case 'support': valA = a.support; valB = b.support; break;
            case 'confidence': valA = a.confidence; valB = b.confidence; break;
            case 'lift': valA = a.lift; valB = b.lift; break;
            case 'conviction': valA = a.conviction; valB = b.conviction; break;
        }
        if (direction === 'asc') return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
    });
}

window.sortTable = (column) => {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'desc';
    }
    renderRules(state.associationRules);
};

// --- ANALYSIS CHARTS ---
function renderAnalysisCharts() {
    renderCategoryChart();
    renderLiftHistogram();
    renderSupportConfidenceScatter();
}

function renderCategoryChart() {
    categoryChartContainer.innerHTML = '<p class="chart-title">Top Purchased Categories</p>';
    const purchaseCounts = {};
    state.purchases.flat().forEach(productId => {
        const product = getProductById(productId);
        if (product) {
            purchaseCounts[product.category] = (purchaseCounts[product.category] || 0) + 1;
        }
    });
    const data = Object.entries(purchaseCounts).sort((a,b) => b[1] - a[1]);
    
    if(data.length === 0) return;

    const margin = {top: 5, right: 5, bottom: 20, left: 25};
    const width = categoryChartContainer.clientWidth - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;

    const svg = d3.select(categoryChartContainer).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().range([0, width]).domain(data.map(d => d[0])).padding(0.2);
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").attr("class", "axis-label");

    const y = d3.scaleLinear().domain([0, d3.max(data, d => d[1])]).range([height, 0]);
    svg.append("g").call(d3.axisLeft(y).ticks(3)).selectAll("text").attr("class", "axis-label");

    svg.selectAll("mybar").data(data).enter().append("rect")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d[1]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d[1]))
        .attr("fill", d => categoryColors[d[0]]);
}
        
function renderLiftHistogram() {
    liftChartContainer.innerHTML = '<p class="chart-title">Rule Strength (Lift) Distribution</p>';
    if(state.associationRules.length < 3) return;
    const liftData = state.associationRules.map(r => r.lift);

    const margin = {top: 5, right: 15, bottom: 20, left: 25};
    const width = liftChartContainer.clientWidth - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;
            
    const svg = d3.select(liftChartContainer).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1, d3.max(liftData) * 1.1]).range([0, width]);
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5)).selectAll("text").attr("class", "axis-label");
            
    const histogram = d3.histogram().value(d => d).domain(x.domain()).thresholds(x.ticks(10));
    const bins = histogram(liftData);

    const y = d3.scaleLinear().range([height, 0]).domain([0, d3.max(bins, d => d.length)]);
    svg.append("g").call(d3.axisLeft(y).ticks(3)).selectAll("text").attr("class", "axis-label");

    svg.selectAll("rect").data(bins).enter().append("rect")
        .attr("x", 1)
        .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`)
        .attr("width", d => x(d.x1) - x(d.x0) - 1)
        .attr("height", d => height - y(d.length))
        .style("fill", "#6366f1");
}

function renderSupportConfidenceScatter() {
    scatterPlotContainer.innerHTML = '<p class="chart-title">Support vs. Confidence</p>';
     if(state.associationRules.length < 1) return;
            
    const margin = {top: 5, right: 15, bottom: 20, left: 25};
    const width = scatterPlotContainer.clientWidth - margin.left - margin.right;
    const height = 150 - margin.top - margin.bottom;

     const svg = d3.select(scatterPlotContainer).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",`translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(state.associationRules, d => d.support) * 1.1]).range([0, width]);
    svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x).ticks(5)).selectAll("text").attr("class", "axis-label");

    const y = d3.scaleLinear().domain([MIN_CONFIDENCE * 0.95, 1]).range([height, 0]);
    svg.append("g").call(d3.axisLeft(y).ticks(4)).selectAll("text").attr("class", "axis-label");

    svg.append('g').selectAll("dot").data(state.associationRules).enter()
        .append("circle")
        .attr("cx", d => x(d.support))
        .attr("cy", d => y(d.confidence))
        .attr("r", 5)
        .style("fill", "#8b5cf6")
        .style("opacity", 0.7)
        .on('mouseover', (event, d) => {
            tooltip.transition().duration(200).style('opacity', .9);
            const antecedentProduct = getProductById(d.antecedent[0]);
            const consequentProduct = getProductById(d.consequent[0]);
            if (antecedentProduct && consequentProduct) {
                tooltip.html(`<strong>${antecedentProduct.image} → ${consequentProduct.image}</strong><br>Lift: ${d.lift.toFixed(2)}`)
                               .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 28) + 'px');
            }
        }).on('mouseout', () => {
            tooltip.transition().duration(500).style('opacity', 0);
        });
}


// --- FP-GROWTH ALGORITHM IMPLEMENTATION ---
class FPNode {
    constructor(itemName, count, parent) {
        this.itemName = itemName; this.count = count; this.parent = parent; this.children = {}; this.nodeLink = null;
    }
}

function runFPGrowth() {
    logMessage("🔍 Starting FP-Growth analysis...", "text-yellow-400");
    const transactions = state.purchases;
    if (transactions.length < 5) {
        logMessage("Not enough purchase data for analysis.", "text-gray-500");
        return;
    }

    // 1. Scan DB for frequent items
    const itemFrequencies = {};
    transactions.forEach(t => t.forEach(item => itemFrequencies[item] = (itemFrequencies[item] || 0) + 1));
    
    const headerTable = Object.entries(itemFrequencies)
        .filter(([_, count]) => count >= MIN_SUPPORT_COUNT)
        .sort((a, b) => b[1] - a[1] || b[0] - a[0])
        .reduce((acc, [item, count]) => ({ ...acc, [item]: [count, null] }), {});
    
    if (Object.keys(headerTable).length === 0) return;

    // 2. Build FP-Tree
    const root = new FPNode('root', 1, null);
    transactions.forEach(t => {
        let sortedT = t.filter(item => headerTable[item]).sort((a, b) => {
            const countA = headerTable[a][0], countB = headerTable[b][0];
            return countB - countA || b - a;
        });
        if (sortedT.length > 0) insertTree(sortedT, root, headerTable);
    });

    // 3. Mine FP-Tree
    const frequentItemsets = [];
    mineTree(headerTable, MIN_SUPPORT_COUNT, new Set(), frequentItemsets);
    
    // 4. Generate Association Rules
    generateRules(frequentItemsets, transactions.length);
    logMessage(`✅ FP-Growth complete. ${state.associationRules.length} strong rules found.`, "text-green-400");
    renderRules(state.associationRules);
    renderAnalysisCharts();
    updateGraph();
    updateMetrics();
}

function insertTree(items, node, headerTable) {
    if (items.length === 0) return;
    const firstItem = items[0];
    let child = node.children[firstItem];
    if (!child) {
        child = new FPNode(firstItem, 1, node);
        node.children[firstItem] = child;
        // Link to header table
        let current = headerTable[firstItem];
        if (current[1] === null) current[1] = child;
        else {
            let nextNode = current[1];
            while (nextNode.nodeLink) nextNode = nextNode.nodeLink;
            nextNode.nodeLink = child;
        }
    } else {
        child.count++;
    }
    insertTree(items.slice(1), child, headerTable);
}
        
function mineTree(headerTable, minSupport, prefix, frequentItemsets) {
    const items = Object.keys(headerTable).sort((a,b) => headerTable[a][0] - headerTable[b][0]);
    for(const item of items) {
        const newPrefix = new Set(prefix);
        newPrefix.add(item);
        frequentItemsets.push(newPrefix);
                
        const conditionalPatternBases = findConditionalPatternBases(headerTable[item][1]);
        const conditionalHeaderTable = {};
        conditionalPatternBases.forEach(base => {
            base.path.forEach(pathItem => conditionalHeaderTable[pathItem] = (conditionalHeaderTable[pathItem] || 0) + base.count);
        });

        Object.keys(conditionalHeaderTable).forEach(key => {
            if (conditionalHeaderTable[key] < minSupport) delete conditionalHeaderTable[key];
        });

        if (Object.keys(conditionalHeaderTable).length > 0) {
             const conditionalHeaderTableWithLinks = Object.entries(conditionalHeaderTable).reduce((acc, [item, count]) => ({...acc, [item]: [count, null]}), {});
             mineTree(conditionalHeaderTableWithLinks, minSupport, newPrefix, frequentItemsets);
        }
    }
}

function findConditionalPatternBases(startNode) {
    const bases = [];
    let currentNode = startNode;
    while (currentNode) {
        const path = [];
        let parent = currentNode.parent;
        while (parent.itemName !== 'root') {
            path.push(parent.itemName);
            parent = parent.parent;
        }
        if (path.length > 0) bases.push({ path: path.reverse(), count: currentNode.count });
        currentNode = currentNode.nodeLink;
    }
    return bases;
}

function generateRules(frequentItemsets, numTransactions) {
    const newRules = [];
    for(const itemset of frequentItemsets) {
        if(itemset.size > 1) {
            const subsets = getSubsets(Array.from(itemset));
            for(const subset of subsets) {
                if (subset.size > 0 && subset.size < itemset.size) {
                    const antecedent = Array.from(subset);
                    const consequent = Array.from(itemset).filter(i => !subset.has(i));
                    if (consequent.length > 0) {
                        const itemsetSupportCount = getSupportCount(itemset, state.purchases);
                        const antecedentSupportCount = getSupportCount(subset, state.purchases);
                        const consequentSupportCount = getSupportCount(new Set(consequent), state.purchases);
                        
                        if(antecedentSupportCount === 0) continue;
                        const confidence = itemsetSupportCount / antecedentSupportCount;

                        if(confidence >= MIN_CONFIDENCE) {
                            const support = itemsetSupportCount / numTransactions;
                            const consequentSupport = consequentSupportCount / numTransactions;
                            if(consequentSupport === 0) continue;
                            const lift = confidence / consequentSupport;
                            const conviction = (1 - consequentSupport) / (1 - confidence);

                            if(antecedent.length === 1 && consequent.length === 1 && isFinite(conviction)){
                                newRules.push({antecedent, consequent, support, confidence, lift, conviction});
                            }
                        }
                    }
                }
            }
        }
    }
    state.associationRules = newRules;
}
        
function getSupportCount(itemset, transactions) {
    return transactions.filter(t => Array.from(itemset).every(item => t.includes(parseInt(item)))).length;
}

const getSubsets = theArray => theArray.reduce((subsets, value) => subsets.concat(subsets.map(set => new Set([...set, value]))), [new Set()]);
        
function triggerRecommendation(userId, purchaseBasket) {
    purchaseBasket.forEach(boughtItemId => {
        const recommendations = state.associationRules
            .filter(rule => rule.antecedent[0] == boughtItemId)
            .map(rule => ({ product: getProductById(rule.consequent[0]), confidence: rule.confidence }))
            .filter(rec => rec.product && !purchaseBasket.includes(rec.product.id));
        if(recommendations.length > 0) renderRecommendation(userId, boughtItemId, recommendations);
    });
}

function simulateEvent() {
    state.totalEvents++;
    const user = users[Math.floor(Math.random() * users.length)];
    const preferredProducts = products.filter(p => user.prefs.includes(p.category));
    if(preferredProducts.length === 0) { updateMetrics(); return; }
    const product = preferredProducts[Math.floor(Math.random() * preferredProducts.length)];
            
    logMessage(`🖱️ ${user.name} viewed ${product.name}`);
            
    state.carts[user.id].add(product.id);
    updateCartUI(user.id);

    if (Math.random() < PURCHASE_CHANCE && state.carts[user.id].size > 0) {
        const purchaseBasket = Array.from(state.carts[user.id]);
        state.purchases.push(purchaseBasket);
        state.totalPurchases++;
        logMessage(`🛒 ${user.name} purchased ${purchaseBasket.length} items!`, "font-bold text-green-400");
                
        triggerRecommendation(user.id, purchaseBasket);
        state.carts[user.id].clear();
        updateCartUI(user.id);
        runFPGrowth();
    }
    updateMetrics();
}
        
// Export rules as CSV
function exportRules() {
    if (state.associationRules.length === 0) return;
    let csv = 'Rule,Support,Confidence (%),Lift,Conviction\n';
    state.associationRules.forEach(rule => {
        const ant = getProductById(rule.antecedent[0])?.name || 'Unknown';
        const con = getProductById(rule.consequent[0])?.name || 'Unknown';
        csv += `"${ant} → ${con}",${rule.support.toFixed(3)},${(rule.confidence * 100).toFixed(1)},${rule.lift.toFixed(2)},${rule.conviction.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'association-rules.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Filter graph nodes based on search
function filterGraph(searchTerm) {
    const term = searchTerm.toLowerCase();
    node.style('display', d => {
        if (!term) return null;
        return (d.name.toLowerCase().includes(term) || d.category.toLowerCase().includes(term)) ? null : 'none';
    });
    link.style('display', d => {
        if (!term) return null;
        const sourceVisible = getProductById(d.source)?.name.toLowerCase().includes(term) || getProductById(d.source)?.category.toLowerCase().includes(term);
        const targetVisible = getProductById(d.target)?.name.toLowerCase().includes(term) || getProductById(d.target)?.category.toLowerCase().includes(term);
        return sourceVisible || targetVisible ? null : 'none';
    });
    linkText.style('display', d => {
        if (!term) return null;
        const sourceVisible = getProductById(d.source)?.name.toLowerCase().includes(term) || getProductById(d.source)?.category.toLowerCase().includes(term);
        const targetVisible = getProductById(d.target)?.name.toLowerCase().includes(term) || getProductById(d.target)?.category.toLowerCase().includes(term);
        return sourceVisible || targetVisible ? null : 'none';
    });
}

function startSimulation() {
    initializeState();
    totalRecommendations = 0;
    recCount.textContent = '0';
            
    recommendationsContainer.innerHTML = `<div class="card p-4 text-center text-gray-500">Personalized recommendations will appear here.</div>`;
    logContainer.innerHTML = '<p class="text-gray-400">System events will be logged here...</p>';
    renderInitialState();
    initGraph();
    renderAnalysisCharts();
    updateMetrics();
            
    startBtn.disabled = true;
    startBtn.textContent = "🚀 Simulation in Progress...";
    pauseBtn.classList.remove('hidden');
    isPaused = false;
    pauseBtn.textContent = '⏸️ Pause';
            
    if (simulationInterval) clearInterval(simulationInterval);
    simulationInterval = setInterval(simulateEvent, simulationSpeed);
}

// Pause/Resume simulation
pauseBtn.addEventListener('click', () => {
    if (isPaused) {
        simulationInterval = setInterval(simulateEvent, simulationSpeed);
        pauseBtn.textContent = '⏸️ Pause';
        isPaused = false;
    } else {
        clearInterval(simulationInterval);
        pauseBtn.textContent = '▶️ Resume';
        isPaused = true;
    }
});

// Product search
productSearch.addEventListener('input', (e) => {
    filterGraph(e.target.value);
});

// Export button
exportBtn.addEventListener('click', exportRules);

// --- INITIALIZATION ---
speedSlider.addEventListener('input', (e) => {
    simulationSpeed = 2200 - e.target.value;
    if (simulationInterval && !isPaused) {
         clearInterval(simulationInterval);
         simulationInterval = setInterval(simulateEvent, simulationSpeed);
    }
});

startBtn.addEventListener('click', startSimulation);
window.addEventListener('resize', () => {
    initGraph();
    renderAnalysisCharts();
});

// Add notification bell to rec header (assuming it's in HTML, but add if needed)
const recHeader = recommendationsContainer.parentElement.querySelector('h2');
if (recHeader && !recHeader.querySelector('.notification-bell')) {
    const bell = document.createElement('span');
    bell.className = 'notification-bell ml-2 text-xl animate-pulse';
    bell.innerHTML = '🔔';
    recHeader.appendChild(bell);
}

initializeState();
renderInitialState();
initGraph();
renderAnalysisCharts();
