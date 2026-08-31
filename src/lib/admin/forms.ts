// src/lib/admin/forms.ts
import type { FieldGroup } from '@/components/admin/resource-form';

/**
 * Field definitions for every catalogue form, in one place.
 *
 * These mirror the Zod write schemas in `@/lib/validation/catalogue`. The
 * server is still the only validator — this list decides what the editor is
 * shown and nothing more. Engine-owned fields (reservedSeats, bookedUnits,
 * usedCount) are absent here for the same reason they are absent there.
 */

type Option = { value: string; label: string };

const CONTENT_STATUS: Option[] = [
  { value: 'DRAFT', label: 'Draft — not visible to the public' },
  { value: 'PUBLISHED', label: 'Published — live on the site' },
  { value: 'ARCHIVED', label: 'Archived — hidden, history kept' },
];

const EVENT_STATUS: Option[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'SOLD_OUT', label: 'Sold out' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const DIFFICULTY: Option[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'CHALLENGING', label: 'Challenging' },
  { value: 'EXTREME', label: 'Extreme' },
];

const SLUG_HINT = 'Lowercase letters, numbers and hyphens. This becomes the page address.';

const seoGroup = (what: string): FieldGroup => ({
  title: 'Search engines',
  description: `How this ${what} appears in Google and in AI answers. Leave blank to fall back to the title and summary.`,
  fields: [
    { name: 'seoTitle', label: 'SEO title', hint: 'Around 60 characters reads best.' },
    {
      name: 'seoDescription',
      label: 'SEO description',
      type: 'textarea',
      rows: 3,
      hint: 'A one- or two-sentence summary, roughly 150 characters.',
    },
  ],
});

export function destinationFields(): FieldGroup[] {
  return [
    {
      title: 'Basics',
      fields: [
        { name: 'name', label: 'Name', required: true, placeholder: 'Saint Martin’s Island' },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        { name: 'country', label: 'Country', required: true, placeholder: 'Bangladesh' },
        { name: 'region', label: 'Region or division', placeholder: 'Cox’s Bazar' },
        {
          name: 'shortDescription',
          label: 'Short description',
          type: 'textarea',
          rows: 2,
          hint: 'One or two lines, shown on cards and in listings.',
        },
        { name: 'description', label: 'Full description', type: 'textarea', rows: 8 },
        {
          name: 'coverMediaId',
          label: 'Cover image',
          type: 'image',
          folder: 'destinations',
          hint: 'Shown on cards, listings and at the top of the destination page.',
        },
      ],
    },
    {
      title: 'Travel guidance',
      fields: [
        { name: 'bestTimeToVisit', label: 'Best time to visit', type: 'textarea', rows: 2 },
        { name: 'travelTips', label: 'Travel tips', type: 'textarea', rows: 5 },
        { name: 'latitude', label: 'Latitude', type: 'number', min: -90, max: 90, step: 0.000001 },
        { name: 'longitude', label: 'Longitude', type: 'number', min: -180, max: 180, step: 0.000001 },
      ],
    },
    {
      title: 'Publishing',
      fields: [
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTENT_STATUS },
        { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers appear first.' },
        { name: 'featured', label: 'Feature this destination on the home page', type: 'checkbox' },
      ],
    },
    seoGroup('destination'),
  ];
}

export function eventFields(destinations: Option[]): FieldGroup[] {
  return [
    {
      title: 'Basics',
      fields: [
        { name: 'title', label: 'Title', required: true, placeholder: 'Sajek Valley Winter Escape' },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        { name: 'destinationId', label: 'Destination', type: 'select', options: destinations },
        { name: 'eventType', label: 'Event type', placeholder: 'Group tour, festival, retreat…' },
        { name: 'shortDescription', label: 'Short description', type: 'textarea', rows: 2 },
        { name: 'description', label: 'Full description', type: 'textarea', rows: 8 },
        {
          name: 'coverMediaId',
          label: 'Cover image',
          type: 'image',
          folder: 'events',
          hint: 'Shown on cards, listings and at the top of the event page.',
        },
      ],
    },
    {
      title: 'Dates and capacity',
      description:
        'Seats already sold are managed by the booking engine and cannot be edited here. Capacity can be raised at any time, but not lowered below the seats already taken.',
      fields: [
        { name: 'startAt', label: 'Starts', type: 'datetime', required: true },
        { name: 'endAt', label: 'Ends', type: 'datetime', required: true },
        { name: 'bookingDeadline', label: 'Booking deadline', type: 'datetime' },
        { name: 'duration', label: 'Duration label', placeholder: '3 days 2 nights' },
        { name: 'capacity', label: 'Total seats', type: 'number', required: true, min: 0 },
        { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY },
      ],
    },
    {
      title: 'Pricing',
      fields: [
        { name: 'price', label: 'Price per person (BDT)', type: 'money', required: true },
        {
          name: 'discountPrice',
          label: 'Discounted price (BDT)',
          type: 'money',
          hint: 'Must be at or below the regular price. Leave blank for no discount.',
        },
      ],
    },
    {
      title: 'What travellers need to know',
      fields: [
        { name: 'meetingPoint', label: 'Meeting point', type: 'textarea', rows: 2 },
        { name: 'transport', label: 'Transport', type: 'textarea', rows: 2 },
        { name: 'accommodation', label: 'Accommodation', type: 'textarea', rows: 2 },
        { name: 'meals', label: 'Meals', type: 'textarea', rows: 2 },
        { name: 'travelTips', label: 'Travel tips', type: 'textarea', rows: 4 },
        { name: 'additionalInfo', label: 'Additional information', type: 'textarea', rows: 4 },
      ],
    },
    {
      title: 'Publishing',
      fields: [
        { name: 'status', label: 'Status', type: 'select', required: true, options: EVENT_STATUS },
        { name: 'featured', label: 'Feature this event on the home page', type: 'checkbox' },
      ],
    },
    seoGroup('event'),
  ];
}

export function tourFields(destinations: Option[]): FieldGroup[] {
  return [
    {
      title: 'Basics',
      fields: [
        { name: 'title', label: 'Title', required: true },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        { name: 'destinationId', label: 'Destination', type: 'select', options: destinations },
        {
          name: 'tourType',
          label: 'Tour type',
          type: 'select',
          required: true,
          options: [
            { value: 'FIXED_DATE', label: 'Fixed date — runs on set dates' },
            { value: 'FLEXIBLE_DATE', label: 'Flexible date — traveller picks' },
            { value: 'CUSTOMIZABLE', label: 'Customisable — built to order' },
          ],
        },
        { name: 'shortDescription', label: 'Short description', type: 'textarea', rows: 2 },
        { name: 'description', label: 'Full description', type: 'textarea', rows: 8 },
        {
          name: 'coverMediaId',
          label: 'Cover image',
          type: 'image',
          folder: 'tours',
          hint: 'Shown on cards, listings and at the top of the tour page.',
        },
      ],
    },
    {
      title: 'Logistics and pricing',
      fields: [
        { name: 'duration', label: 'Duration label', placeholder: '4 days 3 nights' },
        { name: 'durationDays', label: 'Duration in days', type: 'number', min: 1, max: 365 },
        { name: 'basePrice', label: 'Base price (BDT)', type: 'money', required: true },
        { name: 'discountPrice', label: 'Discounted price (BDT)', type: 'money' },
        { name: 'maxGroupSize', label: 'Maximum group size', type: 'number', min: 1, max: 500 },
        { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY },
      ],
    },
    {
      title: 'Details',
      fields: [
        { name: 'highlights', label: 'Highlights', type: 'textarea', rows: 4, hint: 'One per line.' },
        { name: 'inclusions', label: 'What is included', type: 'textarea', rows: 4, hint: 'One per line.' },
        { name: 'exclusions', label: 'What is not included', type: 'textarea', rows: 4, hint: 'One per line.' },
        { name: 'accommodation', label: 'Accommodation', type: 'textarea', rows: 2 },
        { name: 'transport', label: 'Transport', type: 'textarea', rows: 2 },
        { name: 'policies', label: 'Policies', type: 'textarea', rows: 5 },
      ],
    },
    {
      title: 'Publishing',
      fields: [
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTENT_STATUS },
        { name: 'featured', label: 'Feature this tour on the home page', type: 'checkbox' },
      ],
    },
    seoGroup('tour'),
  ];
}

export function activityFields(destinations: Option[]): FieldGroup[] {
  return [
    {
      title: 'Basics',
      fields: [
        { name: 'name', label: 'Name', required: true, placeholder: 'Sea kayaking' },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        { name: 'destinationId', label: 'Destination', type: 'select', options: destinations },
        { name: 'duration', label: 'Duration', placeholder: '2 hours' },
        { name: 'shortDescription', label: 'Short description', type: 'textarea', rows: 2 },
        { name: 'description', label: 'Full description', type: 'textarea', rows: 6 },
        {
          name: 'coverMediaId',
          label: 'Cover image',
          type: 'image',
          folder: 'activities',
          hint: 'Shown on cards, listings and at the top of the activity page.',
        },
      ],
    },
    {
      title: 'Booking and suitability',
      fields: [
        { name: 'price', label: 'Price per person (BDT)', type: 'money' },
        { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY },
        { name: 'minAge', label: 'Minimum age', type: 'number', min: 0, max: 120 },
        { name: 'maxAge', label: 'Maximum age', type: 'number', min: 0, max: 120 },
        {
          name: 'bookable',
          label: 'Travellers can book this activity on its own',
          type: 'checkbox',
        },
        { name: 'trending', label: 'Show in the trending activities strip', type: 'checkbox' },
      ],
    },
    {
      title: 'Details',
      fields: [
        { name: 'included', label: 'What is included', type: 'textarea', rows: 3 },
        { name: 'excluded', label: 'What is not included', type: 'textarea', rows: 3 },
        { name: 'safetyInfo', label: 'Safety information', type: 'textarea', rows: 4 },
      ],
    },
    {
      title: 'Publishing',
      fields: [
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTENT_STATUS },
      ],
    },
  ];
}

export function stayFields(destinations: Option[]): FieldGroup[] {
  return [
    {
      title: 'Basics',
      fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        {
          name: 'type',
          label: 'Property type',
          type: 'select',
          required: true,
          options: [
            { value: 'HOTEL', label: 'Hotel' },
            { value: 'RESORT', label: 'Resort' },
            { value: 'HOMESTAY', label: 'Homestay' },
            { value: 'TREEHOUSE', label: 'Treehouse' },
            { value: 'COTTAGE', label: 'Cottage' },
            { value: 'VILLA', label: 'Villa' },
            { value: 'HOSTEL', label: 'Hostel' },
            { value: 'GUEST_HOUSE', label: 'Guest house' },
            { value: 'CAMP', label: 'Camp' },
          ],
        },
        { name: 'destinationId', label: 'Destination', type: 'select', options: destinations },
        { name: 'address', label: 'Address', type: 'textarea', rows: 2 },
        { name: 'shortDescription', label: 'Short description', type: 'textarea', rows: 2 },
        { name: 'description', label: 'Full description', type: 'textarea', rows: 6 },
        {
          name: 'coverMediaId',
          label: 'Cover image',
          type: 'image',
          folder: 'stays',
          hint: 'Shown on cards, listings and at the top of the property page.',
        },
      ],
    },
    {
      title: 'Stay rules',
      fields: [
        { name: 'checkInTime', label: 'Check-in time', type: 'time' },
        { name: 'checkOutTime', label: 'Check-out time', type: 'time' },
        { name: 'amenities', label: 'Amenities', type: 'textarea', rows: 4, hint: 'One per line.' },
        { name: 'rules', label: 'House rules', type: 'textarea', rows: 4 },
        { name: 'policies', label: 'Cancellation and payment policies', type: 'textarea', rows: 5 },
      ],
    },
    {
      title: 'Publishing',
      fields: [
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTENT_STATUS },
        { name: 'featured', label: 'Feature this property', type: 'checkbox' },
      ],
    },
    seoGroup('property'),
  ];
}

export function visaCountryFields(): FieldGroup[] {
  return [
    {
      title: 'Country',
      fields: [
        { name: 'name', label: 'Country name', required: true, placeholder: 'Thailand' },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        { name: 'code', label: 'Country code', placeholder: 'TH', hint: 'Two or three letters.' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
        { name: 'sortOrder', label: 'Sort order', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTENT_STATUS },
      ],
    },
  ];
}

export function visaTypeFields(countries: Option[]): FieldGroup[] {
  return [
    {
      title: 'Basics',
      fields: [
        { name: 'countryId', label: 'Country', type: 'select', required: true, options: countries },
        { name: 'name', label: 'Visa type', required: true, placeholder: 'Tourist visa' },
        {
          name: 'slug',
          label: 'URL slug',
          type: 'slug',
          required: true,
          hint: 'Unique within this country — each country may have its own tourist-visa.',
        },
        { name: 'title', label: 'Page heading' },
        { name: 'serviceFee', label: 'Service fee (BDT)', type: 'money' },
        { name: 'summary', label: 'Summary', type: 'textarea', rows: 5 },
        { name: 'importantNotes', label: 'Important notes', type: 'textarea', rows: 5 },
      ],
    },
    {
      title: 'Required documents',
      description: 'Shown as separate checklists on the visa page. One document per line.',
      fields: [
        { name: 'generalDocuments', label: 'Everyone', type: 'textarea', rows: 6 },
        { name: 'businessOwnerDocuments', label: 'Business owners', type: 'textarea', rows: 5 },
        { name: 'studentDocuments', label: 'Students', type: 'textarea', rows: 5 },
        { name: 'otherApplicantDocuments', label: 'Other applicants', type: 'textarea', rows: 5 },
      ],
    },
    {
      title: 'Process',
      fields: [
        { name: 'softCopyInstructions', label: 'Soft copy instructions', type: 'textarea', rows: 4 },
        { name: 'hardCopyInstructions', label: 'Hard copy instructions', type: 'textarea', rows: 4 },
        { name: 'processingInfo', label: 'Processing time and steps', type: 'textarea', rows: 4 },
        { name: 'additionalInfo', label: 'Additional information', type: 'textarea', rows: 4 },
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTENT_STATUS },
      ],
    },
    seoGroup('visa page'),
  ];
}

export function noticeFields(): FieldGroup[] {
  return [
    {
      title: 'Notice',
      description: 'Notices appear in the bar across the top of the public site.',
      fields: [
        { name: 'title', label: 'Title', required: true },
        {
          name: 'type',
          label: 'Type',
          type: 'select',
          required: true,
          options: [
            { value: 'INFO', label: 'Information' },
            { value: 'SUCCESS', label: 'Good news' },
            { value: 'WARNING', label: 'Warning' },
            { value: 'IMPORTANT', label: 'Important' },
            { value: 'MAINTENANCE', label: 'Maintenance' },
          ],
        },
        { name: 'message', label: 'Message', type: 'textarea', rows: 3, required: true },
        { name: 'ctaText', label: 'Button text', placeholder: 'See offers' },
        { name: 'ctaUrl', label: 'Button link', placeholder: '/events' },
      ],
    },
    {
      title: 'Scheduling',
      description: 'Leave the dates blank to show the notice immediately and indefinitely.',
      fields: [
        { name: 'startAt', label: 'Show from', type: 'datetime' },
        { name: 'endAt', label: 'Hide after', type: 'datetime' },
        { name: 'priority', label: 'Priority', type: 'number', hint: 'Higher numbers show first.' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ],
    },
  ];
}

export function adFields(): FieldGroup[] {
  return [
    {
      title: 'Creative',
      fields: [
        { name: 'title', label: 'Title', required: true },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
        {
          name: 'mediaId',
          label: 'Creative',
          type: 'image',
          folder: 'ads',
          hint: 'Upload the advert image here. The URL field below is only for a creative hosted somewhere else.',
        },
        { name: 'imageUrl', label: 'Image URL (external)', type: 'url' },
        { name: 'ctaText', label: 'Button text' },
        { name: 'ctaUrl', label: 'Button link' },
        {
          name: 'placement',
          label: 'Placement',
          type: 'select',
          required: true,
          options: [
            { value: 'HOME_BILLBOARD', label: 'Home page billboard' },
            { value: 'HOME_MODAL', label: 'Home page pop-up' },
            { value: 'SIDEBAR', label: 'Sidebar' },
            { value: 'FOOTER', label: 'Footer' },
            { value: 'LISTING_BANNER', label: 'Listing banner' },
          ],
        },
      ],
    },
    {
      title: 'How often people see it',
      description:
        'Frequency capping counts per viewer, not per page load. "3 times a day" means one person sees it at most three times in a day, however many pages they open.',
      fields: [
        {
          name: 'frequency',
          label: 'Times shown',
          type: 'number',
          min: 0,
          max: 100,
          hint: '0 means no limit.',
        },
        {
          name: 'frequencyWindow',
          label: 'Per',
          type: 'select',
          required: true,
          options: [
            { value: 'SESSION', label: 'Visit' },
            { value: 'DAY', label: 'Day' },
            { value: 'WEEK', label: 'Week' },
            { value: 'EVER', label: 'Ever — once the cap is hit, never again' },
          ],
        },
        { name: 'priority', label: 'Priority', type: 'number', hint: 'Higher numbers win a shared slot.' },
        { name: 'startAt', label: 'Run from', type: 'datetime' },
        { name: 'endAt', label: 'Stop after', type: 'datetime' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ],
    },
  ];
}

export function heroSlideFields(): FieldGroup[] {
  return [
    {
      title: 'Slide content',
      fields: [
        { name: 'title', label: 'Headline', required: true },
        { name: 'subtitle', label: 'Subheading', type: 'textarea', rows: 2 },
        { name: 'body', label: 'Supporting text', type: 'textarea', rows: 3 },
        { name: 'primaryCtaText', label: 'Primary button text' },
        { name: 'primaryCtaUrl', label: 'Primary button link' },
        { name: 'secondaryCtaText', label: 'Secondary button text' },
        { name: 'secondaryCtaUrl', label: 'Secondary button link' },
        {
          name: 'mediaId',
          label: 'Background image',
          type: 'image',
          folder: 'hero',
          hint: 'Fills the whole banner. A wide landscape photo works best; text sits on top of it.',
        },
      ],
    },
    {
      title: 'Appearance',
      fields: [
        {
          name: 'overlayOpacity',
          label: 'Image darkening (%)',
          type: 'number',
          min: 0,
          max: 90,
          hint: 'Higher keeps text readable over a bright photo.',
        },
        {
          name: 'textAlign',
          label: 'Text alignment',
          type: 'select',
          required: true,
          options: [
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Centre' },
            { value: 'right', label: 'Right' },
          ],
        },
        { name: 'showSearch', label: 'Show the search box on this slide', type: 'checkbox' },
      ],
    },
    {
      title: 'Scheduling',
      fields: [
        { name: 'startAt', label: 'Show from', type: 'datetime' },
        { name: 'endAt', label: 'Hide after', type: 'datetime' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', hint: 'Lower numbers show first.' },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ],
    },
  ];
}

export function flightRouteFields(): FieldGroup[] {
  return [
    {
      title: 'Route',
      fields: [
        { name: 'airline', label: 'Airline', required: true, placeholder: 'US-Bangla Airlines' },
        { name: 'flightNumber', label: 'Flight number', required: true, placeholder: 'BS-141' },
        { name: 'originIata', label: 'From (IATA)', required: true, placeholder: 'DAC' },
        { name: 'destinationIata', label: 'To (IATA)', required: true, placeholder: 'CXB' },
        { name: 'departureTime', label: 'Departs', type: 'time', required: true },
        { name: 'arrivalTime', label: 'Arrives', type: 'time', required: true },
        {
          name: 'durationMinutes',
          label: 'Duration in minutes',
          type: 'number',
          required: true,
          min: 1,
        },
        { name: 'stops', label: 'Stops', type: 'number', min: 0, max: 5 },
      ],
    },
    {
      title: 'Details',
      fields: [
        {
          name: 'daysOfWeek',
          label: 'Days operated',
          hint: 'Comma-separated, 1 is Monday. For example 1,3,5,7.',
        },
        { name: 'baggage', label: 'Baggage allowance', placeholder: '20kg check-in, 7kg cabin' },
        {
          name: 'indicativePrice',
          label: 'Indicative fare (BDT)',
          type: 'money',
          hint: 'Shown as a guide only, never as a bookable price.',
        },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ],
    },
  ];
}

export function trainScheduleFields(): FieldGroup[] {
  return [
    {
      title: 'Service',
      fields: [
        { name: 'trainName', label: 'Train name', required: true, placeholder: 'Sonar Bangla Express' },
        { name: 'trainNumber', label: 'Train number', placeholder: '787' },
        { name: 'originStation', label: 'From', required: true, placeholder: 'Dhaka' },
        { name: 'destinationStation', label: 'To', required: true, placeholder: 'Chattogram' },
        { name: 'departureTime', label: 'Departs', type: 'time', required: true },
        { name: 'arrivalTime', label: 'Arrives', type: 'time', required: true },
        { name: 'durationMinutes', label: 'Duration in minutes', type: 'number', min: 1 },
        { name: 'offDay', label: 'Off day', placeholder: 'Tuesday' },
      ],
    },
    {
      title: 'Details',
      fields: [
        { name: 'routeStops', label: 'Stops along the way', type: 'textarea', rows: 3 },
        {
          name: 'classesAvailable',
          label: 'Classes available',
          placeholder: 'Shovan Chair, Snigdha, AC Berth',
        },
        { name: 'active', label: 'Active', type: 'checkbox' },
      ],
    },
  ];
}

export function postFields(categories: Option[]): FieldGroup[] {
  return [
    {
      title: 'The article',
      fields: [
        {
          name: 'title',
          label: 'Title',
          required: true,
          span: 2,
          placeholder: 'What to pack for a winter trek in Bandarban',
        },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        { name: 'categoryId', label: 'Category', type: 'select', options: categories },
        {
          name: 'excerpt',
          label: 'Summary',
          type: 'textarea',
          rows: 3,
          hint: 'One or two sentences. Shown on cards, in search results and above the article.',
        },
        {
          name: 'coverMediaId',
          label: 'Cover image',
          type: 'image',
          folder: 'blog',
          hint: 'Shown on the blog card, at the top of the article and when the link is shared.',
        },
        {
          name: 'body',
          label: 'Article',
          type: 'markdown',
          required: true,
          rows: 20,
        },
      ],
    },
    {
      title: 'Publishing',
      description:
        'A draft is visible only here. Publishing puts it on /blog immediately unless you set a future date.',
      fields: [
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTENT_STATUS },
        {
          name: 'publishedAt',
          label: 'Publish date',
          type: 'datetime',
          hint: 'Leave blank to use the moment you publish. A future date schedules it.',
        },
        {
          name: 'tags',
          label: 'Tags',
          placeholder: 'Bandarban, trekking, winter',
          hint: 'Comma separated. Each becomes a link readers can browse by.',
        },
        {
          name: 'readMinutes',
          label: 'Reading time (minutes)',
          type: 'number',
          min: 0,
          max: 240,
          hint: 'Leave at 0 and it is calculated from the article.',
        },
        {
          name: 'featured',
          label: 'Feature this post',
          type: 'checkbox',
          hint: 'Featured posts sort to the top of the blog listing.',
        },
        {
          name: 'commentsOpen',
          label: 'Allow comments',
          type: 'checkbox',
          hint: 'Comments are always reviewed before they appear.',
        },
      ],
    },
    seoGroup('post'),
  ];
}

export function postCategoryFields(): FieldGroup[] {
  return [
    {
      title: 'Category',
      fields: [
        { name: 'name', label: 'Name', required: true, placeholder: 'Trekking' },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          rows: 3,
          hint: 'Shown at the top of the category page and used as its meta description.',
        },
        {
          name: 'position',
          label: 'Sort position',
          type: 'number',
          min: 0,
          max: 999,
          hint: 'Lower numbers appear first in the sidebar.',
        },
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTENT_STATUS },
      ],
    },
  ];
}

const CONTEST_STATUS: Option[] = [
  { value: 'DRAFT', label: 'Draft — not visible to anyone' },
  { value: 'PUBLISHED', label: 'Published — live on the site' },
  { value: 'ARCHIVED', label: 'Archived — hidden, entries kept' },
];

export function contestFields(): FieldGroup[] {
  return [
    {
      title: 'The contest',
      fields: [
        {
          name: 'title',
          label: 'Title',
          required: true,
          span: 2,
          placeholder: 'Monsoon in the Hills — Photo & Video Contest',
        },
        { name: 'slug', label: 'URL slug', type: 'slug', required: true, hint: SLUG_HINT },
        {
          name: 'theme',
          label: 'Theme',
          placeholder: 'Monsoon in the hills',
          hint: 'The one line that tells entrants what to shoot.',
        },
        {
          name: 'tagline',
          label: 'Tagline',
          type: 'textarea',
          rows: 2,
          hint: 'Shown under the title and used as the share description.',
        },
        {
          name: 'coverMediaId',
          label: 'Cover image',
          type: 'image',
          folder: 'contest',
          hint: 'The banner at the top of the contest page.',
        },
        {
          name: 'description',
          label: 'About the contest',
          type: 'markdown',
          required: true,
          rows: 14,
        },
        {
          name: 'rules',
          label: 'Rules and eligibility',
          type: 'markdown',
          rows: 12,
        },
        {
          name: 'prizeSummary',
          label: 'Prize summary',
          type: 'textarea',
          rows: 2,
          hint: 'One line above the prize cards, e.g. “Over 200,000 BDT in prizes”.',
        },
      ],
    },
    {
      title: 'Dates',
      description:
        'These decide everything the public sees. The entry form appears between the opening date and the deadline; voting appears between its own two dates; winners appear from the results date. Nothing needs switching on by hand.',
      fields: [
        { name: 'startAt', label: 'Entries open', type: 'datetime', required: true },
        { name: 'entryDeadline', label: 'Entries close', type: 'datetime', required: true },
        {
          name: 'votingStartAt',
          label: 'Voting opens',
          type: 'datetime',
          hint: 'Leave blank to run the contest without a public vote.',
        },
        { name: 'votingEndAt', label: 'Voting closes', type: 'datetime' },
        {
          name: 'resultsAt',
          label: 'Winners announced',
          type: 'datetime',
          hint: 'Winners stay hidden until this moment, however they are marked.',
        },
      ],
    },
    {
      title: 'Entry rules',
      fields: [
        { name: 'allowImages', label: 'Accept photos', type: 'checkbox' },
        { name: 'allowVideos', label: 'Accept videos', type: 'checkbox' },
        {
          name: 'maxImageBytes',
          label: 'Largest photo (bytes)',
          type: 'number',
          min: 100000,
          max: 20000000,
          hint: '2097152 is 2 MB.',
        },
        {
          name: 'maxVideoSeconds',
          label: 'Longest video (seconds)',
          type: 'number',
          min: 5,
          max: 300,
        },
        {
          name: 'maxEntriesPerUser',
          label: 'Entries per person',
          type: 'number',
          min: 1,
          max: 20,
        },
      ],
    },
    {
      title: 'Judging',
      fields: [
        {
          name: 'publicVoteWeight',
          label: 'Public vote weight (%)',
          type: 'number',
          min: 0,
          max: 50,
          hint: 'How much the public vote counts toward the score you rank by. The judges carry the rest. 0 means judges alone.',
        },
        {
          name: 'shortlistSize',
          label: 'Shortlist size',
          type: 'number',
          min: 3,
          max: 100,
          hint: 'How many entries reach the voting round.',
        },
        {
          name: 'featureOnHome',
          label: 'Show on the home page',
          type: 'checkbox',
          hint: 'The navbar link appears on its own whenever a contest is live.',
        },
        { name: 'status', label: 'Status', type: 'select', required: true, options: CONTEST_STATUS },
      ],
    },
    seoGroup('contest'),
  ];
}

export function contestPrizeFields(contestId: string): FieldGroup[] {
  return [
    {
      title: 'Prize',
      fields: [
        { name: 'contestId', label: 'Contest', type: 'text', required: true, hint: contestId },
        {
          name: 'position',
          label: 'Placing',
          type: 'number',
          min: 0,
          max: 50,
          hint: '1 for first place, 2 for second, 3 for third. 0 for a prize with no placing.',
        },
        { name: 'title', label: 'Prize', required: true, placeholder: 'Three nights in Sajek' },
        { name: 'value', label: 'Value', placeholder: '50,000 BDT' },
        { name: 'description', label: 'Details', type: 'textarea', rows: 3 },
        { name: 'mediaId', label: 'Prize image', type: 'image', folder: 'contest' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', min: 0, max: 999 },
      ],
    },
  ];
}

export function contestJudgeFields(contestId: string): FieldGroup[] {
  return [
    {
      title: 'Judge',
      fields: [
        { name: 'contestId', label: 'Contest', type: 'text', required: true, hint: contestId },
        { name: 'name', label: 'Name', required: true },
        { name: 'role', label: 'Role', placeholder: 'Travel photographer' },
        { name: 'bio', label: 'Short bio', type: 'textarea', rows: 3 },
        { name: 'profileUrl', label: 'Profile link', type: 'url' },
        { name: 'mediaId', label: 'Photo', type: 'image', folder: 'contest' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', min: 0, max: 999 },
      ],
    },
  ];
}

export function contestSponsorFields(contestId: string): FieldGroup[] {
  return [
    {
      title: 'Sponsor',
      fields: [
        { name: 'contestId', label: 'Contest', type: 'text', required: true, hint: contestId },
        { name: 'name', label: 'Name', required: true },
        { name: 'tier', label: 'Tier', placeholder: 'Title sponsor' },
        { name: 'websiteUrl', label: 'Website', type: 'url' },
        { name: 'mediaId', label: 'Logo', type: 'image', folder: 'contest' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', min: 0, max: 999 },
      ],
    },
  ];
}

export function contestGalleryFields(contestId: string): FieldGroup[] {
  return [
    {
      title: 'Gallery image',
      fields: [
        { name: 'contestId', label: 'Contest', type: 'text', required: true, hint: contestId },
        { name: 'mediaId', label: 'Image', type: 'image', folder: 'contest', required: true },
        { name: 'caption', label: 'Caption', type: 'textarea', rows: 2 },
        { name: 'sortOrder', label: 'Sort order', type: 'number', min: 0, max: 999 },
      ],
    },
  ];
}
