const CATEGORY_LABELS = {
  all: 'ሁሉም',
  coffee: 'ቡና',
  kitfo: 'ክትፎ',
  tibs: 'ጥብስ',
  wot: 'ወጥ',
};

const EXPENSE_CATEGORY_LABELS = {
  rent: 'ኪራይ',
  electricity: 'መብራት',
  water: 'ውሃ',
  gas: 'ጋዝ',
  'staff salary': 'ደመወዝ',
  cleaning: 'ጽዳት',
  marketing: 'ግብይት',
  maintenance: 'ጥገና',
  other: 'ሌላ',
};

const ITEM_LABELS = {
  'doro wot': 'ዶሮ ወጥ',
  tibs: 'ጥብስ',
  kitfo: 'ክትፎ',
  'misir wot': 'ምስር ወጥ',
  'ethiopian coffee': 'የኢትዮጵያ ቡና',
  'lamb tibs': 'የበግ ጥብስ',
  beef: 'የበሬ ሥጋ',
  chicken: 'የዶሮ ሥጋ',
  'berbere spice': 'በርበሬ',
  'niter kibbeh (spiced butter)': 'ንጥር ቅቤ',
  onion: 'ሽንኩርት',
  injera: 'እንጀራ',
  'coffee beans': 'የቡና ፍሬ',
  milk: 'ወተት',
  lamb: 'የበግ ሥጋ',
  lentils: 'ምስር',
  tomato: 'ቲማቲም',
  garlic: 'ነጭ ሽንኩርት',
};

const VARIATION_LABELS = {
  'special kitfo': 'ልዩ ክትፎ',
  'regular kitfo': 'መደበኛ ክትፎ',
  'spicy tibs': 'ቅመም ያለው ጥብስ',
  'mild tibs': 'ቀላል ጥብስ',
};

const UNIT_LABELS = {
  kg: 'ኪ.ግ.',
  kilograms: 'ኪ.ግ.',
  liter: 'ሊትር',
  liters: 'ሊትር',
  pieces: 'ቁራጭ',
};

export function categoryLabel(category) {
  return CATEGORY_LABELS[String(category).toLowerCase()] || category;
}

export function itemLabel(name) {
  return ITEM_LABELS[String(name).toLowerCase()] || name;
}

export function variationLabel(name) {
  return VARIATION_LABELS[String(name).toLowerCase()] || name;
}

export function unitLabel(unit) {
  return UNIT_LABELS[String(unit).toLowerCase()] || unit;
}

export function expenseCategoryLabel(category) {
  return EXPENSE_CATEGORY_LABELS[String(category).toLowerCase()] || category;
}

export function notificationMessage(notification) {
  if (notification.type === 'low_stock') {
    const ingredient = itemLabel(notification.ingredient_name || 'ጥሬ ዕቃ');
    const current = notification.current_quantity;
    const unit = unitLabel(notification.unit_of_measure || '');
    return `የ${ingredient} ክምችት አነስተኛ ነው። በአሁኑ ጊዜ ${current ?? '—'} ${unit} አለ። እባክዎን ይግዙ።`;
  }
  return notification.message;
}
