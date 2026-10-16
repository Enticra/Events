// Field definitions that drive the generic admin editor.
// Types: text | textarea | number | bool | list (one item per line) | select
export const SCHEMAS = {
  Product: {
    label: 'Rentals', title: 'name',
    fields: [['name', 'text'], ['slug', 'text'], ['category', 'select', ['Tables', 'Chairs', 'Audio', 'DJ Equipment', 'Lighting', 'Staging', 'Video', 'Dance Floors', 'Special Effects', 'Power & Cables']],
      ['subcategory', 'text'], ['daily_price', 'number'], ['weekend_price', 'number'], ['quantity_owned', 'number'], ['replacement_value', 'number'],
      ['image_url', 'text'], ['description', 'textarea'], ['specifications', 'list'], ['included', 'list'],
      ['featured', 'bool'], ['setup_required', 'bool'], ['delivery_eligible', 'bool'], ['active', 'bool']],
  },
  ServiceOffering: {
    label: 'Services', title: 'name',
    fields: [['name', 'text'], ['slug', 'text'], ['category', 'select', ['DJ', 'Entertainment', 'Special Effects', 'Audio', 'Add-on', 'Production']],
      ['pricing_model', 'select', ['hourly', 'flat', 'per_unit', 'quote']], ['price', 'number'], ['unit_label', 'text'], ['min_hours', 'number'],
      ['image_url', 'text'], ['tagline', 'text'], ['description', 'textarea'], ['included', 'list'],
      ['requires_venue_approval', 'bool'], ['featured', 'bool'], ['active', 'bool']],
  },
  Package: {
    label: 'Packages', title: 'name',
    fields: [['name', 'text'], ['slug', 'text'], ['pricing_model', 'select', ['hourly', 'flat', 'per_unit', 'quote']], ['starting_price', 'number'], ['price_note', 'text'],
      ['min_hours', 'number'], ['min_guests', 'number'], ['max_guests', 'number'], ['indoor_outdoor', 'select', ['both', 'indoor', 'outdoor']],
      ['event_types', 'list'], ['best_for', 'text'], ['image_url', 'text'], ['description', 'textarea'], ['included', 'list'], ['quote_only', 'bool'], ['active', 'bool']],
  },
  ServiceArea: {
    label: 'Service areas', title: 'city',
    fields: [['city', 'text'], ['state', 'text'], ['slug', 'text'], ['market', 'text'], ['delivery_fee', 'number'], ['headline', 'text'], ['body', 'textarea'], ['popular_venues', 'list'], ['image_url', 'text'], ['active', 'bool']],
  },
  BlogPost: {
    label: 'Blog', title: 'title',
    fields: [['title', 'text'], ['slug', 'text'], ['category', 'text'], ['excerpt', 'textarea'], ['meta_description', 'text'], ['image_url', 'text'], ['body', 'textarea'], ['published', 'bool']],
  },
  GalleryItem: {
    label: 'Gallery', title: 'title',
    fields: [['title', 'text'], ['category', 'text'], ['event_type', 'text'], ['venue', 'text'], ['location', 'text'], ['image_url', 'text'], ['services_provided', 'list']],
  },
  Review: {
    label: 'Reviews', title: 'author_name',
    fields: [['author_name', 'text'], ['event_type', 'text'], ['rating', 'number'], ['body', 'textarea'], ['published', 'bool']],
  },
  Performer: {
    label: 'Team', title: 'name',
    fields: [['name', 'text'], ['role', 'select', ['DJ', 'Dhol Player', 'MC', 'Technician', 'Crew']], ['email', 'text'], ['phone', 'text'], ['customer_hourly_rate', 'number'], ['internal_pay_rate', 'number'], ['market', 'text'], ['active', 'bool']],
  },
};

export const emptyDoc = (entity) =>
  Object.fromEntries(SCHEMAS[entity].fields.map(([k, t]) => [k, t === 'bool' ? (k === 'active' || k === 'published') : t === 'list' ? [] : t === 'number' ? null : '']));
