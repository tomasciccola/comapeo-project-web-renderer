/**
 * Resolves a category by following the tags "rope".
 * The rope is a chain where a key's value is the next key in the chain.
 * 
 * Example:
 *   { type: "nature", nature: "water", water: "body-of-water", name: "Test" }
 *   Starting from "type", follows: type -> nature -> water -> body-of-water
 *   Returns: ["nature", "water", "body-of-water"]
 * 
 * @param {Object} tags - The tags object
 * @param {string} startKey - The key to start the rope from (default: "type")
 * @returns {{ category: string[], ropeKeys: Set<string> }}
 */
export function resolveCategory(tags, startKey = 'type') {
  if (!tags || typeof tags !== 'object') {
    return { category: [], ropeKeys: new Set() };
  }

  const category = [];
  const ropeKeys = new Set();
  
  let currentKey = startKey;
  
  // Follow the rope
  while (currentKey && tags.hasOwnProperty(currentKey)) {
    ropeKeys.add(currentKey);
    const value = tags[currentKey];
    
    // Value must be a string to continue the rope
    if (typeof value !== 'string') {
      break;
    }
    
    category.push(value);
    
    // Check if the value is also a key (continues the rope)
    if (tags.hasOwnProperty(value)) {
      currentKey = value;
    } else {
      // End of rope
      break;
    }
  }
  
  return { category, ropeKeys };
}

/**
 * Separates form data from rope keys.
 * 
 * @param {Object} tags - The tags object
 * @param {Set<string>} ropeKeys - Keys that are part of the rope
 * @param {string[]} excludeKeys - Additional keys to exclude (e.g., already displayed elsewhere)
 * @returns {Object} Form data entries as key-value pairs
 */
export function getFormData(tags, ropeKeys, excludeKeys = ['notes']) {
  if (!tags || typeof tags !== 'object') {
    return {};
  }

  const formData = {};
  const excluded = new Set([...ropeKeys, ...excludeKeys]);
  
  for (const [key, value] of Object.entries(tags)) {
    if (!excluded.has(key)) {
      formData[key] = value;
    }
  }
  
  return formData;
}

/**
 * Formats a single category part into a human-readable string.
 * 
 * @param {string} part - A category part
 * @returns {string} Formatted string
 */
function formatCategoryPart(part) {
  return part
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Gets the last category element formatted for display.
 * 
 * @param {string[]} category - Array of category parts
 * @returns {string} Formatted last category element
 */
export function getCategoryLabel(category) {
  if (!category || category.length === 0) {
    return 'Unknown';
  }
  
  return formatCategoryPart(category[category.length - 1]);
}

/**
 * Formats a category array into a full path string (for tooltip/hint).
 * 
 * @param {string[]} category - Array of category parts
 * @returns {string} Formatted category path string
 */
export function getCategoryPath(category) {
  if (!category || category.length === 0) {
    return 'Unknown';
  }
  
  return category.map(formatCategoryPart).join(' › ');
}

/**
 * Formats a tag key into a human-readable label.
 * 
 * @param {string} key - The tag key
 * @returns {string} Formatted label
 */
export function formatTagKey(key) {
  return key
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Formats a tag value for display.
 * 
 * @param {any} value - The tag value
 * @returns {string} Formatted value
 */
export function formatTagValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}
