// Organization logos mapping
// Note: Add actual logo images to assets/logos/ directory

const organizationLogos = {
  'NDMA': require('../../assets/icon.png'), // Placeholder - replace with actual NDMA logo
  'LBSNAA': require('../../assets/icon.png'), // Placeholder - replace with actual LBSNAA logo
  'ATI': require('../../assets/icon.png'), // Placeholder - replace with actual ATI logo
  'SDMA': require('../../assets/icon.png'), // Placeholder - replace with actual SDMA logo
  'default': require('../../assets/icon.png'),
};

// Organization colors for map markers
export const organizationColors = {
  'NDMA': '#EF4444', // Red
  'LBSNAA': '#3B82F6', // Blue
  'ATI': '#10B981', // Green
  'SDMA': '#F59E0B', // Amber
  'default': '#6B7280', // Gray
};

// Organization full names
export const organizationNames = {
  'NDMA': 'National Disaster Management Authority',
  'LBSNAA': 'Lal Bahadur Shastri National Academy of Administration',
  'ATI': 'Administrative Training Institute',
  'SDMA': 'State Disaster Management Authority',
};

export const getOrganizationLogo = (organization) => {
  return organizationLogos[organization] || organizationLogos.default;
};

export const getOrganizationColor = (organization) => {
  return organizationColors[organization] || organizationColors.default;
};

export const getOrganizationName = (organization) => {
  return organizationNames[organization] || organization;
};

export default organizationLogos;
