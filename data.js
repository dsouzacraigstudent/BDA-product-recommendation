// --- 1. DATABASE SETUP ---
export const products = [
    // Electronics
    { id: 1, name: 'Laptop Pro 15"', category: 'Electronics', image: '💻' },
    { id: 2, name: 'Wireless Mouse', category: 'Electronics', image: '🖱️' },
    { id: 3, name: 'Mechanical Keyboard', category: 'Electronics', image: '⌨️' },
    { id: 4, name: '4K Ultra HD Monitor', category: 'Electronics', image: '🖥️' },
    { id: 15, name: 'Noise Cancelling Headphones', category: 'Electronics', image: '🎧' },
    { id: 16, name: 'Smartphone XL', category: 'Electronics', image: '📱' },
    { id: 17, name: 'Portable Charger', category: 'Electronics', image: '🔋' },

    // Apparel
    { id: 5, name: 'Running Shoes', category: 'Apparel', image: '👟' },
    { id: 6, name: 'Cotton T-Shirt', category: 'Apparel', image: '👕' },
    { id: 7, name: 'Designer Jeans', category: 'Apparel', image: '👖' },
    { id: 18, name: 'Leather Jacket', category: 'Apparel', image: '🧥' },
    { id: 19, name: 'Baseball Cap', category: 'Apparel', image: '🧢' },
    { id: 20, name: 'Sports Socks (Pack of 3)', category: 'Apparel', image: '🧦' },
    { id: 29, name: 'Summer Dress', category: 'Apparel', image: '👗' },
    { id: 30, name: 'Wool Scarf', category: 'Apparel', image: '🧣' },

    // Wearables
    { id: 8, name: 'Smart Watch', category: 'Wearables', image: '⌚' },
    { id: 9, name: 'Fitness Tracker', category: 'Wearables', image: '💪' },
    { id: 21, name: 'Wireless Earbuds', category: 'Wearables', image: '🎧' },
    { id: 22, name: 'VR Headset', category: 'Wearables', image: '🕶️' },
    { id: 31, name: 'Smart Glasses', category: 'Wearables', image: '🕶️' },

    // Home Goods
    { id: 10, name: 'Coffee Maker', category: 'Home Goods', image: '☕' },
    { id: 11, name: 'Blender', category: 'Home Goods', image: '🍹' },
    { id: 12, name: 'Air Fryer', category: 'Home Goods', image: '🍟' },
    { id: 23, name: 'Vacuum Cleaner', category: 'Home Goods', image: '🧹' },
    { id: 24, name: 'LED Desk Lamp', category: 'Home Goods', image: '💡' },
    { id: 25, name: 'Non-stick Cookware Set', category: 'Home Goods', image: '🍳' },
    { id: 32, name: 'Memory Foam Pillow', category: 'Home Goods', image: '🛏️' },
    { id: 33, name: 'Wall Art Print', category: 'Home Goods', image: '🖼️' },

    // Books
    { id: 13, name: 'Fantasy Novel: "The Dragon’s Quest"', category: 'Books', image: '📚' },
    { id: 14, name: 'Sci-Fi Classic: "Star Voyager"', category: 'Books', image: '📖' },
    { id: 26, name: 'Self-Help: "Mindset Mastery"', category: 'Books', image: '🧠' },
    { id: 27, name: 'Cookbook: "World Flavors"', category: 'Books', image: '🍽️' },
    { id: 28, name: 'Children’s Storybook: "Adventures in Forest"', category: 'Books', image: '🌲' },
    { id: 34, name: 'History: "Ancient Civilizations"', category: 'Books', image: '🏺' },

    // Sports & Outdoors
    { id: 35, name: 'Mountain Bike', category: 'Sports & Outdoors', image: '🚵' },
    { id: 36, name: 'Camping Tent', category: 'Sports & Outdoors', image: '⛺' },
    { id: 37, name: 'Yoga Mat', category: 'Sports & Outdoors', image: '🧘' },
    { id: 38, name: 'Dumbbell Set', category: 'Sports & Outdoors', image: '🏋️' },

    // Beauty & Personal Care
    { id: 39, name: 'Organic Face Cream', category: 'Beauty & Personal Care', image: '🧴' },
    { id: 40, name: 'Electric Toothbrush', category: 'Beauty & Personal Care', image: '🦷' },
    { id: 41, name: 'Hair Dryer', category: 'Beauty & Personal Care', image: '💇' },
    { id: 42, name: 'Fragrance Perfume', category: 'Beauty & Personal Care', image: '🌸' },

    // Toys & Games
    { id: 43, name: 'Building Blocks Set', category: 'Toys & Games', image: '🧱' },
    { id: 44, name: 'RC Drone', category: 'Toys & Games', image: '🚁' },
    { id: 45, name: 'Puzzle 1000 pieces', category: 'Toys & Games', image: '🧩' },
    { id: 46, name: 'Board Game: Strategy', category: 'Toys & Games', image: '🎲' },

    // Grocery
    { id: 47, name: 'Organic Almonds (500g)', category: 'Grocery', image: '🌰' },
    { id: 48, name: 'Olive Oil', category: 'Grocery', image: '🫒' },
    { id: 49, name: 'Dark Chocolate', category: 'Grocery', image: '🍫' },
    { id: 50, name: 'Herbal Tea Pack', category: 'Grocery', image: '🍵' },
];

export const users = [
    { id: 101, name: 'Alice', prefs: ['Electronics', 'Wearables', 'Books'] },
    { id: 102, name: 'Bob', prefs: ['Apparel', 'Home Goods'] },
    { id: 103, name: 'Charlie', prefs: ['Books', 'Electronics', 'Home Goods'] },
    { id: 104, name: 'Diana', prefs: ['Home Goods', 'Wearables', 'Apparel'] },
    { id: 105, name: 'Eve', prefs: ['Apparel', 'Books', 'Wearables'] },
    { id: 106, name: 'Frank', prefs: ['Electronics', 'Home Goods'] },
    { id: 107, name: 'Grace', prefs: ['Books', 'Apparel'] },
    { id: 108, name: 'Hank', prefs: ['Electronics', 'Wearables'] },
    { id: 109, name: 'Ivy', prefs: ['Home Goods', 'Books'] },
    { id: 110, name: 'Jack', prefs: ['Apparel', 'Electronics'] },
    { id: 111, name: 'Karen', prefs: ['Sports & Outdoors', 'Beauty & Personal Care'] },
    { id: 112, name: 'Leo', prefs: ['Toys & Games', 'Books'] },
    { id: 113, name: 'Mona', prefs: ['Grocery', 'Home Goods'] },
    { id: 114, name: 'Nina', prefs: ['Beauty & Personal Care', 'Apparel'] },
    { id: 115, name: 'Oscar', prefs: ['Electronics', 'Sports & Outdoors'] },
];

export const categoryColors = {
    'Electronics': '#3b82f6',
    'Apparel': '#10b981',
    'Wearables': '#ef4444',
    'Home Goods': '#f97316',
    'Books': '#8b5cf6',
    'Sports & Outdoors': '#14b8a6',
    'Beauty & Personal Care': '#db2777',
    'Toys & Games': '#f59e0b',
    'Grocery': '#a3e635',
};

// --- 2. SIMULATION STATE & CONFIGURATION ---
export const PURCHASE_CHANCE = 0.25;
export const MIN_SUPPORT_COUNT = 2;
export const MIN_CONFIDENCE = 0.5;
