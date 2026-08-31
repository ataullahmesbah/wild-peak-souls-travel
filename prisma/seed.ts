// prisma/seed.ts
/**
 * Wild Peak Souls — database seed.
 *
 * Idempotent: every write is an upsert keyed on a natural unique field, so
 * running it repeatedly converges rather than duplicating. Safe to run against
 * an existing database.
 *
 *   npm run db:seed
 */

import bcrypt from 'bcryptjs';

import {
  AccommodationType,
  AdPlacement,
  ContentStatus,
  Difficulty,
  EventStatus,
  NoticeType,
  PrismaClient,
  RoleName,
  SettingType,
  TourType,
} from '../src/generated/prisma';
import {
  ALL_PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  permissionModule,
} from '../src/lib/rbac/permissions';

const prisma = new PrismaClient();

const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=70`;

function daysFromNow(days: number, hour = 6): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function seedPermissions() {
  console.log('→ permissions');
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      create: { key, module: permissionModule(key), description: key },
      update: { module: permissionModule(key) },
    });
  }
  console.log(`  ${ALL_PERMISSIONS.length} permissions`);
}

async function seedRoles() {
  console.log('→ roles');
  const permissions = await prisma.permission.findMany({
    select: { id: true, key: true },
  });
  const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: {
        name: roleName,
        label: ROLE_LABELS[roleName],
        description: `${ROLE_LABELS[roleName]} role`,
        systemRole: true,
      },
      update: { label: ROLE_LABELS[roleName] },
      select: { id: true },
    });

    // Reset to the declared mapping so the seed is the source of truth for
    // system roles — manual grants to custom roles are unaffected.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const keys = ROLE_PERMISSIONS[roleName];
    if (keys.length === 0) continue;

    await prisma.rolePermission.createMany({
      data: keys
        .map((key) => permissionIdByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });

    console.log(`  ${roleName}: ${keys.length} permissions`);
  }
}

async function seedUsers() {
  console.log('→ users');
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@wildpeaksouls.com';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe#2026';
  const passwordHash = await bcrypt.hash(password, 12);

  const accounts: Array<{
    name: string;
    email: string;
    phone: string;
    role: RoleName;
  }> = [
    { name: 'Platform Owner', email, phone: '+8801700000001', role: RoleName.SUPER_ADMIN },
    {
      name: 'Operations Admin',
      email: 'ops@wildpeaksouls.com',
      phone: '+8801700000002',
      role: RoleName.ADMIN,
    },
    {
      name: 'Content Editor',
      email: 'content@wildpeaksouls.com',
      phone: '+8801700000003',
      role: RoleName.CONTENT_MANAGER,
    },
    {
      name: 'Support Agent',
      email: 'support@wildpeaksouls.com',
      phone: '+8801700000004',
      role: RoleName.SUPPORT_AGENT,
    },
    {
      name: 'Finance Manager',
      email: 'finance@wildpeaksouls.com',
      phone: '+8801700000005',
      role: RoleName.FINANCE_MANAGER,
    },
    {
      name: 'Demo Traveller',
      email: 'traveller@example.com',
      phone: '+8801700000006',
      role: RoleName.CUSTOMER,
    },
  ];

  for (const account of accounts) {
    const role = await prisma.role.findUnique({
      where: { name: account.role },
      select: { id: true },
    });
    if (!role) continue;

    const user = await prisma.user.upsert({
      where: { email: account.email },
      create: {
        name: account.name,
        email: account.email,
        phone: account.phone,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
      update: { name: account.name },
      select: { id: true },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      create: { userId: user.id, roleId: role.id },
      update: {},
    });
  }

  console.log(`  ${accounts.length} accounts (shared password from SEED_SUPER_ADMIN_PASSWORD)`);
  console.log(`  sign in as ${email}`);
}

async function seedSettings() {
  console.log('→ settings');

  const settings: Array<{
    key: string;
    value: string;
    type: SettingType;
    category: string;
    label: string;
    description?: string;
    isSecret?: boolean;
  }> = [
    // General
    { key: 'general.brandName', value: 'Wild Peak Souls', type: SettingType.STRING, category: 'general', label: 'Brand name' },
    { key: 'general.brandTagline', value: 'Journeys crafted for wandering souls', type: SettingType.STRING, category: 'general', label: 'Tagline' },
    { key: 'general.contactEmail', value: 'hello@wildpeaksouls.com', type: SettingType.STRING, category: 'general', label: 'Contact email' },
    { key: 'general.contactPhone', value: '+880 1700 000000', type: SettingType.STRING, category: 'general', label: 'Contact phone' },
    { key: 'general.contactAddress', value: 'House 12, Road 4, Banani, Dhaka 1213, Bangladesh', type: SettingType.STRING, category: 'general', label: 'Office address' },
    { key: 'general.social.facebook', value: 'https://facebook.com/wildpeaksouls', type: SettingType.STRING, category: 'general', label: 'Facebook URL' },
    { key: 'general.social.instagram', value: 'https://instagram.com/wildpeaksouls', type: SettingType.STRING, category: 'general', label: 'Instagram URL' },
    { key: 'general.social.youtube', value: '', type: SettingType.STRING, category: 'general', label: 'YouTube URL' },
    { key: 'general.social.whatsapp', value: 'https://wa.me/8801700000000', type: SettingType.STRING, category: 'general', label: 'WhatsApp link' },
    { key: 'general.currency', value: 'BDT', type: SettingType.STRING, category: 'general', label: 'Currency' },
    { key: 'general.timezone', value: 'Asia/Dhaka', type: SettingType.STRING, category: 'general', label: 'Timezone' },

    // Auth
    { key: 'auth.googleEnabled', value: 'false', type: SettingType.BOOLEAN, category: 'auth', label: 'Google sign-in', description: 'Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to be set.' },
    { key: 'auth.otpEnabled', value: 'false', type: SettingType.BOOLEAN, category: 'auth', label: 'Require OTP', description: 'When on, every sign-in and sign-up needs a 6-digit code. Connect an SMS or email provider first.' },
    { key: 'auth.signupEnabled', value: 'true', type: SettingType.BOOLEAN, category: 'auth', label: 'Allow new registrations' },

    // Payment
    { key: 'payment.bkash.enabled', value: 'true', type: SettingType.BOOLEAN, category: 'payment', label: 'bKash enabled' },
    { key: 'payment.bkash.number', value: '01700-000000', type: SettingType.STRING, category: 'payment', label: 'bKash number', description: 'Shown to customers at checkout.' },
    { key: 'payment.bkash.instructions', value: 'Use Send Money (not Payment). Keep the confirmation SMS until your booking is confirmed.', type: SettingType.STRING, category: 'payment', label: 'bKash instructions' },
    { key: 'payment.nagad.enabled', value: 'true', type: SettingType.BOOLEAN, category: 'payment', label: 'Nagad enabled' },
    { key: 'payment.nagad.number', value: '01800-000000', type: SettingType.STRING, category: 'payment', label: 'Nagad number' },
    { key: 'payment.nagad.instructions', value: 'Use Send Money. Enter the exact amount shown — partial payments delay verification.', type: SettingType.STRING, category: 'payment', label: 'Nagad instructions' },
    { key: 'payment.sslcommerz.enabled', value: 'false', type: SettingType.BOOLEAN, category: 'payment', label: 'SSLCommerz enabled', description: 'Card gateway. Keep off until merchant credentials are configured.' },

    // SEO
    { key: 'seo.siteTitle', value: 'Wild Peak Souls — Premium Travel Experiences', type: SettingType.STRING, category: 'seo', label: 'Site title' },
    { key: 'seo.siteDescription', value: 'Curated tours, group departures, stays, visa assistance and custom journeys across Bangladesh and beyond — operated end to end by Wild Peak Souls.', type: SettingType.STRING, category: 'seo', label: 'Site description' },
    { key: 'seo.defaultOgImage', value: '', type: SettingType.STRING, category: 'seo', label: 'Default OG image URL' },
    { key: 'seo.robotsIndex', value: 'true', type: SettingType.BOOLEAN, category: 'seo', label: 'Allow search indexing', description: 'Turn off for staging environments.' },

    // Analytics
    { key: 'analytics.ga4Id', value: '', type: SettingType.STRING, category: 'analytics', label: 'GA4 measurement ID' },
    { key: 'analytics.gtmId', value: '', type: SettingType.STRING, category: 'analytics', label: 'Google Tag Manager ID' },
    { key: 'analytics.metaPixelId', value: '', type: SettingType.STRING, category: 'analytics', label: 'Meta Pixel ID' },
    { key: 'analytics.metaCapiToken', value: '', type: SettingType.STRING, category: 'analytics', label: 'Meta CAPI token', description: 'Server-side only — never sent to the browser.', isSecret: true },

    // Maintenance
    { key: 'maintenance.enabled', value: 'false', type: SettingType.BOOLEAN, category: 'maintenance', label: 'Maintenance mode', description: 'Public site shows a maintenance page. Staff keep dashboard access.' },
    { key: 'maintenance.message', value: 'We are making some improvements and will be back very soon. Existing bookings are unaffected.', type: SettingType.STRING, category: 'maintenance', label: 'Maintenance message' },
    { key: 'maintenance.returnAt', value: '', type: SettingType.STRING, category: 'maintenance', label: 'Expected return time', description: 'ISO date-time, e.g. 2026-09-01T14:00:00Z' },

    // Business
    { key: 'business.bookingTerms', value: 'Bookings are held for 24 hours pending payment verification. Prices are snapshotted at the time of booking.', type: SettingType.STRING, category: 'business', label: 'Booking terms summary' },
    { key: 'business.cancellationWindowHours', value: '72', type: SettingType.NUMBER, category: 'business', label: 'Free cancellation window (hours)' },
    { key: 'business.minAdvanceHours', value: '24', type: SettingType.NUMBER, category: 'business', label: 'Minimum advance booking (hours)' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type,
        category: setting.category,
        label: setting.label,
        description: setting.description ?? null,
        isSecret: setting.isSecret ?? false,
      },
      // Only metadata is refreshed on re-seed — an operator's saved value wins.
      update: {
        label: setting.label,
        description: setting.description ?? null,
        type: setting.type,
        category: setting.category,
        isSecret: setting.isSecret ?? false,
      },
    });
  }

  console.log(`  ${settings.length} settings`);
}

async function seedMedia() {
  console.log('→ media');
  const assets: Array<{ key: string; url: string; alt: string; folder: string }> = [
    { key: 'bandarban', url: IMG('photo-1544735716-392fe2489ffa'), alt: 'Green hills at sunrise in Bandarban', folder: 'destinations' },
    { key: 'sajek', url: IMG('photo-1506905925346-21bda4d32df4'), alt: 'Cloud-covered valley at Sajek', folder: 'destinations' },
    { key: 'coxsbazar', url: IMG('photo-1507525428034-b723cf961d3e'), alt: "Long sandy beach at Cox's Bazar", folder: 'destinations' },
    { key: 'sundarbans', url: IMG('photo-1441974231531-c6227db76b6e'), alt: 'Dense mangrove forest waterway', folder: 'destinations' },
    { key: 'srimangal', url: IMG('photo-1566369520426-0d5b6a0c1b60'), alt: 'Rolling tea garden in Srimangal', folder: 'destinations' },
    { key: 'sylhet', url: IMG('photo-1470071459604-3b5ec3a7fe05'), alt: 'Misty hills and river in Sylhet', folder: 'destinations' },
    { key: 'trek', url: IMG('photo-1551632811-561732d1e306'), alt: 'Group trekking on a mountain trail', folder: 'events' },
    { key: 'camp', url: IMG('photo-1504280390367-361c6d9f38f4'), alt: 'Tents at a hillside campsite at dusk', folder: 'events' },
    { key: 'boat', url: IMG('photo-1502680390469-be75c86b636f'), alt: 'Wooden boat on calm water', folder: 'activities' },
    { key: 'waterfall', url: IMG('photo-1432405972618-c60b0225b8f9'), alt: 'Waterfall in dense forest', folder: 'activities' },
    { key: 'resort', url: IMG('photo-1571003123894-1f0594d2b5d9'), alt: 'Hillside resort with a view', folder: 'stays' },
    { key: 'treehouse', url: IMG('photo-1520250497591-112f2f40a3f4'), alt: 'Wooden treehouse among trees', folder: 'stays' },
    { key: 'homestay', url: IMG('photo-1518780664697-55e3ad937233'), alt: 'Simple homestay room with garden view', folder: 'stays' },
    { key: 'guide-packing', url: IMG('photo-1523987355523-c7b5b0dd90a7'), alt: 'Packed backpack and hiking gear', folder: 'guides' },
    { key: 'guide-monsoon', url: IMG('photo-1428592953211-077101b2021b'), alt: 'Rain over green hills', folder: 'guides' },
    { key: 'guide-food', url: IMG('photo-1567337710282-00832b415979'), alt: 'Local Bangladeshi meal', folder: 'guides' },
  ];

  const map = new Map<string, string>();
  for (const asset of assets) {
    const record = await prisma.mediaAsset.upsert({
      where: { id: `seed-media-${asset.key}` },
      create: {
        id: `seed-media-${asset.key}`,
        provider: 'external',
        url: asset.url,
        secureUrl: asset.url,
        type: 'image',
        altText: asset.alt,
        folder: asset.folder,
      },
      update: { url: asset.url, secureUrl: asset.url, altText: asset.alt },
      select: { id: true },
    });
    map.set(asset.key, record.id);
  }

  console.log(`  ${assets.length} media assets`);
  return map;
}

async function seedDestinations(media: Map<string, string>) {
  console.log('→ destinations');

  const destinations = [
    {
      slug: 'bandarban',
      name: 'Bandarban',
      region: 'Chittagong Hill Tracts',
      media: 'bandarban',
      featured: true,
      shortDescription:
        "Bangladesh's highest peaks, Marma and Bawm villages, and the country's best trekking country.",
      description:
        "Bandarban is where the plains finally give up and the land starts climbing. Keokradong, Tazingdong and Saka Haphong all sit within a few days' walk of each other, connected by ridge trails that pass through Bawm and Marma villages where you will almost certainly be offered tea.\n\nThe district rewards people who slow down. Nilgiri and Nilachal are worth the drive, but the trips people talk about years later are the ones that involved a guide, a permit, and three days of walking.\n\nPermits are required for the deeper treks and take time to arrange — we handle that as part of every Bandarban itinerary.",
      bestTimeToVisit: 'October to March. Trails are dry, skies are clear, and nights are cool enough for comfortable camping.',
      travelTips:
        'Carry your national ID or passport — it is checked at army posts.\nTrekking permits must be arranged in advance; we do this for you.\nMobile coverage is patchy past Ruma. Tell someone your route.\nCash only in the hill bazaars — there are no ATMs past Ruma Bazar.\nRespect village photography norms and always ask first.',
    },
    {
      slug: 'sajek-valley',
      name: 'Sajek Valley',
      region: 'Rangamati',
      media: 'sajek',
      featured: true,
      shortDescription:
        'A ridge-top valley that sits above the clouds most mornings between June and February.',
      description:
        "Sajek is the easiest way to stand above a sea of cloud in Bangladesh. The valley sits at around 1,800 feet on a ridge in Rangamati district, reached by a spectacular road through Khagrachari.\n\nMornings are the whole point. Konglak Para, a short walk from the resort strip, gives the widest view — go before sunrise and the clouds fill the valleys below you.\n\nThe road in runs in army-escorted convoys at fixed times, so arrival and departure are not flexible. We build itineraries around those windows.",
      bestTimeToVisit: 'June to February. Monsoon months give the heaviest cloud cover; winter gives the clearest long-distance views.',
      travelTips:
        'The convoy leaves Khagrachari at fixed times — missing it means waiting for the next one.\nBook accommodation before you travel; Sajek fills completely on weekends and holidays.\nElectricity is generator-based and runs on a schedule at most resorts.\nCarry cash — card payment is not reliable here.\nWater is trucked in; use it sparingly.',
    },
    {
      slug: 'srimangal',
      name: 'Srimangal',
      region: 'Sylhet Division',
      media: 'srimangal',
      featured: true,
      shortDescription:
        "The tea capital — rolling gardens, Lawachara rainforest, and the country's best birdwatching.",
      description:
        "Srimangal is green in a way that photographs never quite manage. Tea gardens roll to the horizon, and between them sit Lawachara National Park, the Baikka Beel wetland and a string of small Khasi and Manipuri villages.\n\nIt is the gentlest destination we run. There is no hard trekking, the roads are good, and it works as well for families as for photographers.\n\nGo early for the birds. Lawachara at 6am is a different place from Lawachara at 10am, and the hoolock gibbons are heard far more often than seen.",
      bestTimeToVisit: 'November to March for birds and comfortable walking. May to September for the greenest gardens, with rain.',
      travelTips:
        'Book a park guide at Lawachara — it doubles what you see and supports local employment.\nThe seven-layer tea is worth the queue, once.\nCycle rickshaws are the best way to move between gardens.\nBaikka Beel is at its best in the early morning during winter.\nCarry insect repellent for the forest walks.',
    },
    {
      slug: 'coxs-bazar',
      name: "Cox's Bazar",
      region: 'Chittagong Division',
      media: 'coxsbazar',
      featured: false,
      shortDescription:
        "The world's longest natural sea beach, plus the quieter coastline south towards Teknaf.",
      description:
        "Cox's Bazar is 120 kilometres of unbroken sand, and the town end of it is busy in a way that surprises first-time visitors. The trick is to keep going.\n\nInani and Himchari, south of the main strip, are considerably quieter. Further down, the Marine Drive towards Teknaf is one of the best coastal roads in South Asia.\n\nSaint Martin's Island runs as a separate trip and is seasonal — ferries operate roughly November to March, subject to weather and current regulations.",
      bestTimeToVisit: 'November to March. Sea conditions are calm and the humidity is manageable.',
      travelTips:
        'The main beach is busiest between Laboni and Sugandha points — walk south for space.\nSwim only in flagged areas; the currents here are genuinely dangerous.\nSaint Martin’s access is regulated and changes season to season — confirm before planning around it.\nMarine Drive is best in the late afternoon.\nAvoid the peak Eid and winter-holiday weekends unless you have booked far ahead.',
    },
    {
      slug: 'sundarbans',
      name: 'Sundarbans',
      region: 'Khulna Division',
      media: 'sundarbans',
      featured: false,
      shortDescription:
        "The world's largest mangrove forest, and the only way to responsibly see Royal Bengal tiger country.",
      description:
        "The Sundarbans is a UNESCO World Heritage site and the largest mangrove forest on earth. It is accessible only by boat, and everything about a trip here — routes, permits, guides, forest department escorts — has to be arranged in advance.\n\nYou are unlikely to see a tiger. You are very likely to see spotted deer, crocodiles, macaques, kingfishers and, if you are patient, an otter fishing.\n\nWe run these as liveaboard trips from Khulna or Mongla. Day trips exist but barely scratch the forest.",
      bestTimeToVisit: 'November to February. Cooler, drier, and the best wildlife visibility.',
      travelTips:
        'Forest department permits and an armed escort are mandatory — this is not optional or negotiable.\nBring binoculars; almost everything is seen at distance.\nNeutral clothing and quiet behaviour genuinely improve sightings.\nNo mobile coverage for most of the route.\nNever leave the boat except with your guide at designated points.',
    },
    {
      slug: 'sylhet',
      name: 'Sylhet',
      region: 'Sylhet Division',
      media: 'sylhet',
      featured: false,
      shortDescription:
        'Ratargul swamp forest, Jaflong stone beds, and the haor wetlands at Tanguar.',
      description:
        "Sylhet division packs an unusual amount of variety into a small area: freshwater swamp forest at Ratargul, the boulder-strewn river beds at Jaflong and Bichanakandi, and the vast Tanguar Haor wetland further north.\n\nMost of it is water-dependent. Ratargul is only properly navigable by boat in the monsoon; Bichanakandi is at its best just after the rains when the water runs clear over the stones.\n\nTanguar Haor is the standout for people who want quiet — an overnight houseboat there is one of the best nights you can have in Bangladesh.",
      bestTimeToVisit: 'June to September for the swamp forest and haors. October to February for comfortable weather and clear water.',
      travelTips:
        'Ratargul boats are small — go early to avoid the queue and the crowds.\nBichanakandi and Jaflong sit on the Indian border; carry ID.\nHaor houseboats vary enormously in quality — this is worth booking through someone who knows the operators.\nRoads deteriorate badly in heavy monsoon.\nLocal boatmen set prices seasonally; agree the fare before departing.',
    },
  ];

  const map = new Map<string, string>();
  for (const [index, item] of destinations.entries()) {
    const record = await prisma.destination.upsert({
      where: { slug: item.slug },
      create: {
        name: item.name,
        slug: item.slug,
        country: 'Bangladesh',
        region: item.region,
        shortDescription: item.shortDescription,
        description: item.description,
        bestTimeToVisit: item.bestTimeToVisit,
        travelTips: item.travelTips,
        coverMediaId: media.get(item.media) ?? null,
        featured: item.featured,
        sortOrder: index,
        status: ContentStatus.PUBLISHED,
        seoTitle: `${item.name} Travel Guide — Tours, Stays & Trips`,
        seoDescription: item.shortDescription,
      },
      update: {
        shortDescription: item.shortDescription,
        description: item.description,
        coverMediaId: media.get(item.media) ?? null,
        featured: item.featured,
        status: ContentStatus.PUBLISHED,
      },
      select: { id: true },
    });
    map.set(item.slug, record.id);
  }

  console.log(`  ${destinations.length} destinations`);
  return map;
}

async function seedActivities(
  destinations: Map<string, string>,
  media: Map<string, string>,
) {
  console.log('→ activities');

  const activities = [
    {
      slug: 'keokradong-trek',
      name: 'Keokradong Summit Trek',
      destination: 'bandarban',
      media: 'trek',
      duration: '2 days',
      price: 4500,
      difficulty: Difficulty.CHALLENGING,
      trending: true,
      bookable: false,
      minAge: 16,
      shortDescription: 'A two-day walk to one of the highest accessible points in Bangladesh.',
      description:
        'From Ruma Bazar the trail climbs through Bawm villages to Boga Lake, then on to the Keokradong ridge. It is a real trek — steep, sustained, and worth every step for the ridge-line views at dawn.',
      included: 'Certified local guide\nTrekking permits and army registration\nVillage homestay at Boga Lake\nAll meals on the trail\nFirst-aid kit and group safety gear',
      excluded: 'Personal trekking gear\nTravel insurance\nPorter (available on request)\nSnacks and bottled drinks',
      safetyInfo:
        'Reasonable fitness is required — expect 6–8 hours of walking per day.\nWe do not run this route in heavy monsoon; the descent becomes genuinely dangerous.\nThere is no mobile coverage on the ridge.\nThe guide’s decision to turn back is final and is not negotiable.',
    },
    {
      slug: 'sajek-sunrise-hike',
      name: 'Konglak Para Sunrise Hike',
      destination: 'sajek-valley',
      media: 'camp',
      duration: '2 hours',
      price: 800,
      difficulty: Difficulty.EASY,
      trending: true,
      bookable: true,
      shortDescription: 'A short pre-dawn walk to the best cloud view in the valley.',
      description:
        'Leave the resort strip at around 5am and walk up to Konglak Para, the Lusai village at the top of the ridge. On a good morning the valleys below fill completely with cloud.',
      included: 'Local guide\nTorch\nTea at the village',
      excluded: 'Breakfast\nTransport to Sajek',
      safetyInfo:
        'The path is uneven and unlit — proper footwear matters.\nGo with a guide; the ridge drops away sharply on both sides.\nRespect the village: ask before photographing people or homes.',
    },
    {
      slug: 'lawachara-birdwatching',
      name: 'Lawachara Dawn Birdwatching',
      destination: 'srimangal',
      media: 'waterfall',
      duration: '3 hours',
      price: 1200,
      difficulty: Difficulty.EASY,
      trending: true,
      bookable: true,
      shortDescription: 'Early-morning walk through semi-evergreen rainforest with a park guide.',
      description:
        'Lawachara holds around 250 bird species along with the hoolock gibbon. Starting at first light gives the best chance of both — the gibbons call at dawn and the forest goes quiet by mid-morning.',
      included: 'Park entry\nCertified naturalist guide\nBinoculars (shared)',
      excluded: 'Transport from your hotel\nBreakfast\nCamera equipment',
      safetyInfo:
        'Stay on marked trails — the forest floor holds leeches in the wet season.\nNo feeding wildlife under any circumstances.\nKeep voices low; noise ends sightings.',
    },
    {
      slug: 'tanguar-houseboat',
      name: 'Tanguar Haor Houseboat Night',
      destination: 'sylhet',
      media: 'boat',
      duration: '1 night',
      price: 3800,
      difficulty: Difficulty.EASY,
      trending: true,
      bookable: true,
      shortDescription: 'An overnight on the water in one of the largest wetlands in the country.',
      description:
        'Board at Tahirpur in the afternoon, cross the open haor at sunset, and moor for the night under an unusually dark sky. Mornings bring migratory birds and a very quiet sunrise.',
      included: 'Houseboat berth\nAll meals on board\nBoatman and guide\nLife jackets',
      excluded: 'Transport to Tahirpur\nAlcohol\nPersonal expenses',
      safetyInfo:
        'Life jackets are mandatory on the open water — no exceptions.\nWe do not sail in storm warnings; trips are rescheduled rather than risked.\nThere is no mobile coverage across most of the haor.',
    },
    {
      slug: 'jadipai-waterfall',
      name: 'Jadipai Waterfall Descent',
      destination: 'bandarban',
      media: 'waterfall',
      duration: '5 hours',
      price: 1800,
      difficulty: Difficulty.MODERATE,
      trending: false,
      bookable: false,
      minAge: 14,
      shortDescription: 'A steep descent to one of the widest waterfalls in the Hill Tracts.',
      description:
        'Usually combined with the Keokradong route. The descent is short but very steep, and the falls are at their most dramatic just after the monsoon.',
      included: 'Guide\nSafety rope where needed',
      excluded: 'Transport\nMeals',
      safetyInfo:
        'The rocks are slippery year-round. Proper footwear is required, not recommended.\nWe do not descend during or immediately after heavy rain.\nSwimming is at the guide’s discretion depending on flow.',
    },
    {
      slug: 'sundarbans-canal-cruise',
      name: 'Sundarbans Narrow Canal Cruise',
      destination: 'sundarbans',
      media: 'boat',
      duration: '4 hours',
      price: 2500,
      difficulty: Difficulty.EASY,
      trending: false,
      bookable: false,
      shortDescription: 'Small-boat exploration of the narrow channels where the wildlife actually is.',
      description:
        'The main rivers are wide and quiet. The wildlife is in the narrow canals, which are reached by small boat from the mother vessel — deer at the water line, kingfishers, macaques and, occasionally, fresh tiger pugmarks on a mudbank.',
      included: 'Small boat\nForest guide and armed escort\nBinoculars (shared)',
      excluded: 'Main cruise fare\nPermits (included in the main package)',
      safetyInfo:
        'Never stand in the small boat.\nStay with the escort at all designated landing points.\nSilence dramatically improves what you will see.',
    },
    {
      slug: 'tea-garden-cycling',
      name: 'Tea Garden Cycling Route',
      destination: 'srimangal',
      media: 'trek',
      duration: '4 hours',
      price: 1500,
      difficulty: Difficulty.EASY,
      trending: false,
      bookable: true,
      shortDescription: 'A flat, easy ride through working tea estates and Manipuri villages.',
      description:
        'A relaxed loop on quiet estate roads, stopping at a working factory and a Manipuri weaving village. Almost entirely flat and suitable for anyone comfortable on a bicycle.',
      included: 'Bicycle and helmet\nGuide\nFactory visit\nTea tasting',
      excluded: 'Lunch\nSouvenir purchases',
      safetyInfo:
        'Estate roads carry occasional trucks — ride single file.\nHelmets are compulsory on our rides.\nCarry water; there is little shade in the middle of the gardens.',
    },
    {
      slug: 'marine-drive-sunset',
      name: 'Marine Drive Sunset Run',
      destination: 'coxs-bazar',
      media: 'coxsbazar',
      duration: '3 hours',
      price: 2200,
      difficulty: Difficulty.EASY,
      trending: false,
      bookable: true,
      shortDescription: 'The coastal road south to Inani and Patuartek at golden hour.',
      description:
        'A late-afternoon drive down one of the best coastal roads in the region, with stops at Himchari, Inani rock beach and Patuartek for sunset.',
      included: 'Private vehicle and driver\nGuide\nBottled water',
      excluded: 'Entry tickets\nFood and drink',
      safetyInfo:
        'Swimming at Inani is not supervised — the rocks make currents unpredictable.\nStay off the rocks after dark.',
    },
  ];

  const map = new Map<string, string>();
  for (const item of activities) {
    const record = await prisma.activity.upsert({
      where: { slug: item.slug },
      create: {
        name: item.name,
        slug: item.slug,
        destinationId: destinations.get(item.destination) ?? null,
        coverMediaId: media.get(item.media) ?? null,
        shortDescription: item.shortDescription,
        description: item.description,
        duration: item.duration,
        price: item.price,
        difficulty: item.difficulty,
        minAge: item.minAge ?? null,
        included: item.included,
        excluded: item.excluded,
        safetyInfo: item.safetyInfo,
        bookable: item.bookable,
        trending: item.trending,
        status: ContentStatus.PUBLISHED,
      },
      update: {
        shortDescription: item.shortDescription,
        description: item.description,
        price: item.price,
        trending: item.trending,
        bookable: item.bookable,
        status: ContentStatus.PUBLISHED,
      },
      select: { id: true },
    });
    map.set(item.slug, record.id);
  }

  console.log(`  ${activities.length} activities`);
  return map;
}

async function seedEvents(
  destinations: Map<string, string>,
  media: Map<string, string>,
  activities: Map<string, string>,
) {
  console.log('→ events');

  const events = [
    {
      slug: 'keokradong-winter-expedition',
      title: 'Keokradong Winter Expedition',
      destination: 'bandarban',
      media: 'trek',
      startDays: 21,
      nights: 3,
      capacity: 14,
      reserved: 9,
      price: 12500,
      discountPrice: 10900,
      difficulty: Difficulty.CHALLENGING,
      featured: true,
      eventType: 'Trekking expedition',
      duration: '4 days, 3 nights',
      meetingPoint: 'Kalabagan Bus Counter, Dhaka — 21:30 the night before departure',
      transport: 'Non-AC coach Dhaka–Bandarban, then chander gari (open jeep) to Ruma Bazar',
      accommodation: 'Bawm village homestay at Boga Lake (shared), guesthouse in Bandarban town',
      meals: '8 meals — all breakfasts, lunches and dinners on the trail',
      shortDescription:
        'Four days on the Ruma–Boga–Keokradong ridge, with a night in a Bawm village and a dawn summit.',
      description:
        'This is the classic Bandarban ridge route, run in the dry season when the trails are safe and the mornings are clear.\n\nWe travel overnight to Bandarban, transfer to Ruma Bazar and complete the permit formalities, then start walking. The first day climbs steadily to Boga Lake, where we stay with a Bawm family. Day two is the long one — the ridge to Keokradong, with the summit itself timed for the following dawn.\n\nGroup size is capped at 14. That is not a marketing number: above that, the homestays cannot host us properly and the trail experience degrades for everyone.\n\nYou need to be genuinely fit. Expect six to eight hours of walking on consecutive days, with sustained climbs and a steep descent at the end.',
      travelTips:
        'Break in your boots before the trip — blisters end more treks here than fitness does.\nBring a headtorch; the summit start is in the dark.\nNights at Boga Lake drop close to 8°C in January.\nCarry your NID or passport; it is checked at three army posts.\nThere is no ATM past Ruma Bazar.',
      additionalInfo:
        'Permits are arranged by us and included in the price.\nA porter can be added for BDT 1,500 per day, split across the group.\nThe itinerary can change at short notice if the army closes a route — this is outside our control and we will always prioritise safety over the schedule.',
      activities: ['keokradong-trek', 'jadipai-waterfall'],
      itinerary: [
        { day: 1, title: 'Dhaka → Bandarban → Ruma Bazar', description: 'Arrive in Bandarban early morning, breakfast, permit formalities, then chander gari to Ruma Bazar. Afternoon briefing and gear check. Overnight in a Ruma guesthouse.' },
        { day: 2, title: 'Ruma → Boga Lake', description: 'A steady 5–6 hour climb through Marma and Bawm settlements. Arrive at Boga Lake mid-afternoon. Swim if the weather allows, then dinner with our host family.' },
        { day: 3, title: 'Boga Lake → Keokradong ridge', description: 'The long day — 7 hours along the ridge with wide views on both sides. We camp near the summit so the sunrise is a short walk rather than a night march.' },
        { day: 4, title: 'Summit, Jadipai descent, return', description: 'Dawn at the summit, then the steep descent past Jadipai waterfall and back to Ruma. Afternoon transport to Bandarban and the night coach to Dhaka.' },
      ],
      options: [
        { title: 'Shared porter', description: 'One porter for every three trekkers, carrying group gear.', price: 1500 },
        { title: 'Sleeping bag rental', description: 'Rated to 5°C. Cleaned between trips.', price: 600 },
        { title: 'AC coach upgrade', description: 'Both directions, subject to availability.', price: 1800 },
      ],
      policies: [
        { title: 'Cancellation', content: 'Full refund up to 14 days before departure. 50% between 14 and 7 days. No refund inside 7 days, as permits and homestays are paid in advance on your behalf.' },
        { title: 'Fitness requirement', content: 'This trek involves 6–8 hours of walking per day on steep, uneven ground. If you have a cardiac, respiratory or joint condition, speak to us before booking — we will tell you honestly whether it is suitable.' },
        { title: 'Route changes', content: 'Army permissions for the Hill Tracts can change without notice. If a route closes we will substitute an equivalent alternative. If the whole trip becomes impossible we refund in full.' },
      ],
    },
    {
      slug: 'sajek-cloud-weekend',
      title: 'Sajek Cloud Weekend',
      destination: 'sajek-valley',
      media: 'camp',
      startDays: 12,
      nights: 2,
      capacity: 20,
      reserved: 20,
      price: 8900,
      discountPrice: null,
      difficulty: Difficulty.EASY,
      featured: true,
      eventType: 'Weekend group trip',
      duration: '3 days, 2 nights',
      meetingPoint: 'Fakirapool Bus Counter, Dhaka — 22:00 Thursday',
      transport: 'AC coach to Khagrachari, then chander gari in the army convoy to Sajek',
      accommodation: 'Ridge-side resort, twin sharing with attached bathroom',
      meals: '5 meals — breakfasts and dinners at the resort, one lunch on the road',
      shortDescription:
        'Two nights on the ridge, with the Konglak sunrise and the Khagrachari waterfall circuit on the way back.',
      description:
        'The most popular trip we run, and the easiest introduction to the Hill Tracts. No trekking beyond a short sunrise walk.\n\nWe travel overnight on Thursday, join the morning convoy from Khagrachari, and are on the ridge by lunchtime. Both mornings start early at Konglak Para for the cloud view. On the return we stop at Alutila cave and Risang waterfall.\n\nThis departure runs on a fixed date and fills fast — Sajek accommodation is genuinely limited and we book the whole block in advance.',
      travelTips:
        'Bring a light jacket. It is noticeably colder on the ridge than in Dhaka.\nPower runs on generator schedules — charge devices when you can.\nWater is trucked up. Use it carefully.\nCash only; there is no reliable card payment in the valley.',
      additionalInfo:
        'The convoy times are set by the army and are not negotiable — a late arrival at Khagrachari means missing the day.\nSingle-occupancy rooms are available at a supplement, subject to availability.',
      activities: ['sajek-sunrise-hike'],
      itinerary: [
        { day: 1, title: 'Dhaka → Khagrachari → Sajek', description: 'Overnight coach, breakfast in Khagrachari, then the convoy to Sajek. Afternoon at leisure on the ridge, sunset at Helipad, dinner at the resort.' },
        { day: 2, title: 'Konglak sunrise and valley day', description: 'Pre-dawn walk to Konglak Para for the cloud view. Late breakfast, then a relaxed day — Lusai village, Ruilui Para, and the second sunset.' },
        { day: 3, title: 'Sajek → Khagrachari → Dhaka', description: 'Morning convoy down, stopping at Alutila cave and Risang waterfall. Lunch in Khagrachari and the evening coach back to Dhaka.' },
      ],
      options: [
        { title: 'Single occupancy room', description: 'A room to yourself for both nights.', price: 3500 },
        { title: 'Photography guide', description: 'A dedicated guide for the sunrise and sunset shoots.', price: 1200 },
      ],
      policies: [
        { title: 'Cancellation', content: 'Full refund up to 10 days before departure. 40% between 10 and 5 days. No refund inside 5 days — Sajek resort bookings are non-refundable to us.' },
        { title: 'Convoy timing', content: 'Access to Sajek is by army convoy at fixed times. If you miss the group departure you will need to arrange your own transport to join us, at your own cost.' },
      ],
    },
    {
      slug: 'srimangal-tea-and-birds',
      title: 'Srimangal Tea Gardens & Birding Weekend',
      destination: 'srimangal',
      media: 'waterfall',
      startDays: 30,
      nights: 2,
      capacity: 16,
      reserved: 4,
      price: 9500,
      discountPrice: 8500,
      difficulty: Difficulty.EASY,
      featured: true,
      eventType: 'Nature and photography',
      duration: '3 days, 2 nights',
      meetingPoint: 'Kamalapur Railway Station, Dhaka — 06:15 Friday',
      transport: 'Intercity train Dhaka–Srimangal, local transport throughout',
      accommodation: 'Tea estate bungalow, twin sharing',
      meals: '6 meals including a Manipuri dinner',
      shortDescription:
        'Lawachara at dawn, Baikka Beel for waterbirds, and two nights in a working tea estate bungalow.',
      description:
        'An unhurried weekend built around early mornings. We travel by train, which is both the most pleasant way to reach Srimangal and the most reliable.\n\nBoth mornings start before sunrise — Lawachara on the first, Baikka Beel on the second. Between them there is time for the tea factory, the Manipuri weaving village, and as much of the seven-layer tea ritual as you want.\n\nSuitable for families and for anyone who would rather walk gently than climb.',
      travelTips:
        'Binoculars transform this trip. Bring them if you have them; we carry a shared set.\nLeeches are present in Lawachara during and after the rains — leech socks help.\nThe train is far more comfortable than the bus. Book early.\nMornings in December and January are genuinely cold at 5am.',
      additionalInfo:
        'A certified park naturalist accompanies both morning walks.\nChildren over 8 are welcome on this departure.',
      activities: ['lawachara-birdwatching', 'tea-garden-cycling'],
      itinerary: [
        { day: 1, title: 'Dhaka → Srimangal, tea estates', description: 'Morning train, arrive around midday. Check in at the bungalow, then an afternoon cycling loop through the estates with a factory visit and tasting.' },
        { day: 2, title: 'Lawachara dawn, Manipuri village', description: 'Pre-dawn departure for Lawachara with a park naturalist. Late breakfast, afternoon at the Manipuri weaving village, and dinner cooked by a Manipuri family.' },
        { day: 3, title: 'Baikka Beel, return to Dhaka', description: 'Early boat at Baikka Beel for migratory waterbirds. Back for brunch, then the afternoon train to Dhaka.' },
      ],
      options: [
        { title: 'Single occupancy room', description: 'Private room for both nights in the bungalow.', price: 3000 },
        { title: 'Binocular rental', description: '8×42 pair for the duration of the trip.', price: 500 },
      ],
      policies: [
        { title: 'Cancellation', content: 'Full refund up to 10 days before departure. 50% between 10 and 4 days. No refund inside 4 days.' },
        { title: 'Wildlife viewing', content: 'We can guarantee the guide, the timing and the location — not the animals. Hoolock gibbons are heard on most mornings and seen on perhaps one in three.' },
      ],
    },
    {
      slug: 'sundarbans-liveaboard',
      title: 'Sundarbans Liveaboard Expedition',
      destination: 'sundarbans',
      media: 'boat',
      startDays: 45,
      nights: 3,
      capacity: 18,
      reserved: 6,
      price: 24500,
      discountPrice: 21900,
      difficulty: Difficulty.MODERATE,
      featured: false,
      eventType: 'Wildlife expedition',
      duration: '4 days, 3 nights aboard',
      meetingPoint: 'Khulna launch ghat — 07:00',
      transport: 'Liveaboard vessel with small boats for canal exploration',
      accommodation: 'Twin-share cabins aboard, attached bathroom',
      meals: 'All meals aboard, including fresh river fish',
      shortDescription:
        'Four days inside the mangrove forest by boat, with forest department guides and daily canal excursions.',
      description:
        'The Sundarbans cannot be done properly as a day trip. This is a liveaboard: you sleep on the boat, wake up inside the forest, and spend the early mornings in narrow canals where the wildlife actually is.\n\nWe carry a forest department guide and armed escort throughout, as required by law. Landings are limited to designated points — Kotka, Katka and Hiron Point among them.\n\nManage your expectations on tigers. In four days you will very likely see deer, crocodiles, macaques, monitor lizards and a dozen kingfisher species. You may see pugmarks. Actual tiger sightings are rare and nobody honest will promise you one.',
      travelTips:
        'Neutral-coloured clothing genuinely improves what you see.\nBinoculars are essential, not optional.\nThere is no mobile coverage for most of the route.\nBring seasickness tablets if you are prone — the open river can be choppy.',
      additionalInfo:
        'Forest department permits, guide and armed escort fees are included.\nThe route may change based on tidal conditions and forest department direction.',
      activities: ['sundarbans-canal-cruise'],
      itinerary: [
        { day: 1, title: 'Khulna → Harbaria', description: 'Board at Khulna, cruise through the Rupsha and Pasur rivers. Afternoon walk at Harbaria eco park. Overnight moored inside the forest.' },
        { day: 2, title: 'Kotka and the narrow canals', description: 'Dawn small-boat excursion into the canals. Late morning at Kotka, walking the forest trail to the sea beach with the escort. Sunset from the deck.' },
        { day: 3, title: 'Jamtola beach and Hiron Point', description: 'Early trail to Jamtola. Afternoon at Hiron Point, one of the better spots for deer and macaque. Night cruise back towards Khulna.' },
        { day: 4, title: 'Return to Khulna', description: 'Final morning canal run, brunch aboard, and arrival at Khulna in the early afternoon.' },
      ],
      options: [
        { title: 'Single cabin', description: 'A cabin to yourself for the full voyage.', price: 8000 },
        { title: 'Dhaka transfer (both ways)', description: 'AC coach Dhaka–Khulna return, timed to the boat.', price: 3500 },
      ],
      policies: [
        { title: 'Cancellation', content: 'Full refund up to 21 days before departure. 50% between 21 and 10 days. No refund inside 10 days — the vessel and permits are committed well in advance.' },
        { title: 'Safety aboard', content: 'Life jackets must be worn on all small-boat excursions. Nobody leaves the vessel except with the forest guide and escort, at designated landing points only.' },
      ],
    },
    {
      slug: 'tanguar-haor-houseboat-weekend',
      title: 'Tanguar Haor Houseboat Weekend',
      destination: 'sylhet',
      media: 'boat',
      startDays: 60,
      nights: 2,
      capacity: 24,
      reserved: 0,
      price: 11500,
      discountPrice: null,
      difficulty: Difficulty.EASY,
      featured: false,
      eventType: 'Houseboat weekend',
      duration: '3 days, 2 nights',
      meetingPoint: 'Sayedabad Bus Terminal, Dhaka — 22:00 Thursday',
      transport: 'Night coach to Sunamganj, then houseboat throughout',
      accommodation: 'Houseboat, shared deck cabins',
      meals: 'All meals aboard',
      shortDescription:
        'Two nights on a houseboat across one of the largest wetlands in the country, with a stop at Niladri Lake.',
      description:
        'Tanguar Haor at dawn is one of the quietest places you can reach in Bangladesh. We board at Tahirpur, cross the open haor, and moor overnight under a dark sky.\n\nThe route includes Niladri Lake (Shimul Bagan in season), the Jadukata river, and the Barek Tila viewpoint on the Indian border.\n\nThis is a slow trip. There is very little to do beyond watch the water change colour, which is the entire point.',
      travelTips:
        'Nights on the water are colder than you expect — bring a layer.\nThere is no mobile coverage across most of the haor.\nThe boat toilets are basic. Manage expectations accordingly.\nSwimming is possible at designated stops with life jackets.',
      additionalInfo:
        'We do not sail under storm warnings — affected departures are rescheduled or refunded in full.\nBoat quality varies enormously in this region; we use one operator we have worked with for years.',
      activities: ['tanguar-houseboat'],
      itinerary: [
        { day: 1, title: 'Dhaka → Tahirpur → open haor', description: 'Arrive in Sunamganj at dawn, transfer to Tahirpur and board. Cross into the open haor, moor for lunch, and spend the afternoon on the water. Overnight moored mid-haor.' },
        { day: 2, title: 'Niladri, Jadukata, Barek Tila', description: 'Morning at Niladri Lake, then the clear water of the Jadukata river. Afternoon climb to Barek Tila for the border view. Second night aboard.' },
        { day: 3, title: 'Return', description: 'Sunrise over the haor, breakfast aboard, then back to Tahirpur and the afternoon coach to Dhaka.' },
      ],
      options: [
        { title: 'Private cabin', description: 'Enclosed cabin instead of a shared deck berth.', price: 4000 },
      ],
      policies: [
        { title: 'Cancellation', content: 'Full refund up to 10 days before departure. 50% between 10 and 5 days. No refund inside 5 days.' },
        { title: 'Weather', content: 'We do not sail in storm conditions. If a departure is cancelled for weather you receive a full refund or a transfer to another date, your choice.' },
      ],
    },
    {
      slug: 'coxs-bazar-marine-drive-escape',
      title: "Cox's Bazar Marine Drive Escape",
      destination: 'coxs-bazar',
      media: 'coxsbazar',
      startDays: 8,
      nights: 2,
      capacity: 25,
      reserved: 11,
      price: 7900,
      discountPrice: 6900,
      difficulty: Difficulty.EASY,
      featured: false,
      eventType: 'Beach weekend',
      duration: '3 days, 2 nights',
      meetingPoint: 'Arambagh Bus Counter, Dhaka — 22:30',
      transport: 'AC coach both ways, private vehicle for the Marine Drive day',
      accommodation: 'Beachfront hotel, twin sharing',
      meals: '4 meals — breakfasts and one seafood dinner',
      shortDescription:
        'Two nights on the beach with the full Marine Drive circuit to Inani, Patuartek and Himchari.',
      description:
        "The straightforward version of Cox's Bazar, done properly: a hotel away from the busiest strip, and a full day on the Marine Drive rather than an hour of it.\n\nWe cover Himchari, Inani rock beach and Patuartek, timed so that sunset happens where it should. There is a seafood dinner on the second night and enough unstructured time to actually rest.",
      travelTips:
        'Swim only in flagged areas. The currents here are genuinely dangerous.\nThe rocks at Inani are sharp — footwear matters.\nAvoid the peak winter-holiday weekends unless you like crowds.\nNegotiate before any beach photography or horse ride.',
      additionalInfo:
        "Saint Martin's Island is not included — it runs as a separate seasonal trip subject to current ferry regulations.",
      activities: ['marine-drive-sunset'],
      itinerary: [
        { day: 1, title: "Dhaka → Cox's Bazar", description: 'Overnight coach, arrive mid-morning. Check in, rest, and an easy afternoon on Laboni beach. Sunset walk south towards Sugandha.' },
        { day: 2, title: 'Marine Drive day', description: 'Private vehicle south along the Marine Drive — Himchari waterfall, Inani rock beach, Patuartek for sunset. Seafood dinner back in town.' },
        { day: 3, title: 'Return', description: 'Free morning on the beach, late checkout, and the afternoon coach back to Dhaka.' },
      ],
      options: [
        { title: 'Sea-view room upgrade', description: 'Both nights, subject to availability.', price: 2500 },
        { title: 'Single occupancy', description: 'A room to yourself.', price: 4000 },
      ],
      policies: [
        { title: 'Cancellation', content: 'Full refund up to 7 days before departure. 50% between 7 and 3 days. No refund inside 3 days.' },
        { title: 'Sea safety', content: 'Swimming is at your own risk and only in lifeguard-flagged areas. Our guides will stop anyone entering the water under a red flag.' },
      ],
    },
  ];

  for (const item of events) {
    const startAt = daysFromNow(item.startDays);
    const endAt = daysFromNow(item.startDays + item.nights, 20);
    const soldOut = item.reserved >= item.capacity;

    const event = await prisma.event.upsert({
      where: { slug: item.slug },
      create: {
        title: item.title,
        slug: item.slug,
        shortDescription: item.shortDescription,
        description: item.description,
        destinationId: destinations.get(item.destination) ?? null,
        eventType: item.eventType,
        coverMediaId: media.get(item.media) ?? null,
        startAt,
        endAt,
        duration: item.duration,
        capacity: item.capacity,
        reservedSeats: item.reserved,
        price: item.price,
        discountPrice: item.discountPrice,
        bookingDeadline: daysFromNow(item.startDays - 3),
        difficulty: item.difficulty,
        meetingPoint: item.meetingPoint,
        transport: item.transport,
        accommodation: item.accommodation,
        meals: item.meals,
        travelTips: item.travelTips,
        additionalInfo: item.additionalInfo,
        featured: item.featured,
        status: soldOut ? EventStatus.SOLD_OUT : EventStatus.PUBLISHED,
        seoTitle: `${item.title} — Group Departure`,
        seoDescription: item.shortDescription,
      },
      update: {
        shortDescription: item.shortDescription,
        description: item.description,
        startAt,
        endAt,
        price: item.price,
        discountPrice: item.discountPrice,
        featured: item.featured,
        status: soldOut ? EventStatus.SOLD_OUT : EventStatus.PUBLISHED,
      },
      select: { id: true },
    });

    // Child rows are replaced wholesale so a re-seed cannot duplicate them.
    await prisma.eventItinerary.deleteMany({ where: { eventId: event.id } });
    await prisma.eventItinerary.createMany({
      data: item.itinerary.map((day, index) => ({
        eventId: event.id,
        dayNumber: day.day,
        title: day.title,
        description: day.description,
        sortOrder: index,
      })),
    });

    await prisma.eventOption.deleteMany({ where: { eventId: event.id } });
    await prisma.eventOption.createMany({
      data: item.options.map((option, index) => ({
        eventId: event.id,
        title: option.title,
        description: option.description,
        price: option.price,
        sortOrder: index,
        status: ContentStatus.PUBLISHED,
      })),
    });

    await prisma.eventPolicy.deleteMany({ where: { eventId: event.id } });
    await prisma.eventPolicy.createMany({
      data: item.policies.map((policy, index) => ({
        eventId: event.id,
        title: policy.title,
        content: policy.content,
        sortOrder: index,
      })),
    });

    await prisma.eventActivity.deleteMany({ where: { eventId: event.id } });
    const activityIds = item.activities
      .map((slug) => activities.get(slug))
      .filter((id): id is string => Boolean(id));
    if (activityIds.length > 0) {
      await prisma.eventActivity.createMany({
        data: activityIds.map((activityId) => ({ eventId: event.id, activityId })),
        skipDuplicates: true,
      });
    }

    const galleryIds = [media.get(item.media), media.get('trek'), media.get('camp')]
      .filter((id): id is string => Boolean(id))
      .slice(0, 3);
    await prisma.eventGallery.deleteMany({ where: { eventId: event.id } });
    await prisma.eventGallery.createMany({
      data: galleryIds.map((mediaId, index) => ({
        eventId: event.id,
        mediaId,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  ${events.length} events`);
}

async function seedTours(destinations: Map<string, string>, media: Map<string, string>) {
  console.log('→ tours');

  const tours = [
    {
      slug: 'bandarban-classic-4d',
      title: 'Bandarban Classic — 4 Days',
      destination: 'bandarban',
      media: 'bandarban',
      type: TourType.FIXED_DATE,
      durationDays: 4,
      duration: '4 days, 3 nights',
      basePrice: 14500,
      discountPrice: 12900,
      difficulty: Difficulty.MODERATE,
      featured: true,
      maxGroupSize: 12,
      shortDescription:
        'Nilgiri, Boga Lake and a Bawm village, run at a pace that leaves time to actually look around.',
      description:
        'The best of Bandarban without the full expedition commitment. We cover Nilgiri and Nilachal for the views, Boga Lake for a night in a Bawm village, and the Sangu river by boat.\n\nThere is some walking — a couple of hours a day at most — but nothing that requires trekking experience.\n\nGroup size is capped at 12 so we can use the smaller, better homestays.',
      highlights:
        'Sunrise above the clouds at Nilgiri\nA night in a Bawm village at Boga Lake\nSangu river boat run to Remakri\nChimbuk ridge road, one of the best drives in Bangladesh\nMarma market at Bandarban town',
      inclusions:
        'AC coach transfer from Dhaka, both directions\nAll ground transport including chander gari\nAccommodation for 3 nights\nAll breakfasts, 3 lunches, 3 dinners\nEnglish and Bangla-speaking guide\nAll permits and entry fees\nBoat hire on the Sangu',
      exclusions:
        'Personal expenses and shopping\nTravel insurance\nAlcohol and soft drinks\nTips for drivers and guides\nAnything not listed under inclusions',
      accommodation: 'Nilgiri cottage (1 night), Bawm homestay at Boga Lake (1 night), Bandarban town hotel (1 night)',
      transport: 'AC coach Dhaka–Bandarban, chander gari in the hills, country boat on the Sangu',
      policies:
        'Bookings are confirmed on payment verification, usually within one business day.\n\nFull refund up to 14 days before departure; 50% between 14 and 7 days; no refund inside 7 days.\n\nWe run this tour with a minimum of 4 travellers. Below that we will offer you a transfer to another date or a full refund.',
      itinerary: [
        { day: 1, title: 'Dhaka → Bandarban → Nilgiri', description: 'Arrive early, breakfast in Bandarban, then the Chimbuk ridge road to Nilgiri. Afternoon at the viewpoint, sunset above the cloud line, overnight in a Nilgiri cottage.' },
        { day: 2, title: 'Nilgiri → Ruma → Boga Lake', description: 'Descend to Ruma Bazar for permits, then a two-hour walk up to Boga Lake. Afternoon at the lake, evening with our Bawm host family.' },
        { day: 3, title: 'Sangu river and Remakri', description: 'Back to Ruma, then a country boat down the Sangu to Remakri falls. Return by boat in the late afternoon and overnight in Bandarban town.' },
        { day: 4, title: 'Nilachal and return', description: 'Morning at Nilachal, then the Marma market for anything you want to take home. Afternoon coach back to Dhaka.' },
      ],
    },
    {
      slug: 'sylhet-water-country-3d',
      title: 'Sylhet Water Country — 3 Days',
      destination: 'sylhet',
      media: 'sylhet',
      type: TourType.FLEXIBLE_DATE,
      durationDays: 3,
      duration: '3 days, 2 nights',
      basePrice: 11500,
      discountPrice: null,
      difficulty: Difficulty.EASY,
      featured: true,
      maxGroupSize: 15,
      shortDescription:
        'Ratargul swamp forest, Bichanakandi and Jaflong, timed for the season that suits each one.',
      description:
        'Sylhet division works best when you go to each place at the right time of year, which is exactly what a fixed itinerary usually gets wrong.\n\nThis tour runs on your dates, and we adjust the order and the emphasis based on water levels — Ratargul in the monsoon, Bichanakandi just after, Jaflong when the river runs clear.\n\nIt is an easy trip. Boats, short walks, and good roads throughout.',
      highlights:
        'Ratargul, the only freshwater swamp forest in Bangladesh\nBichanakandi where the river runs over stone from the Meghalaya hills\nJaflong and the Dawki river border view\nLalakhal, and the tea gardens on the way\nShah Jalal shrine in Sylhet town',
      inclusions:
        'All ground transport in a private vehicle\n2 nights accommodation\nDaily breakfast\nAll boat hire\nGuide throughout\nEntry fees',
      exclusions:
        'Travel to and from Sylhet\nLunches and dinners\nPersonal expenses\nTravel insurance',
      accommodation: 'Sylhet town hotel, twin sharing, both nights',
      transport: 'Private AC vehicle throughout, country boats at each site',
      policies:
        'Flexible-date tours are confirmed once we agree the dates in writing and payment is verified.\n\nFull refund up to 10 days before the agreed start date; 50% between 10 and 5 days; no refund inside 5 days.\n\nWater levels determine what is possible. If a site is genuinely inaccessible we substitute an equivalent and tell you in advance.',
      itinerary: [
        { day: 1, title: 'Ratargul swamp forest', description: 'Arrive in Sylhet, check in, then out to Ratargul for the afternoon. Boat through the swamp forest, back for dinner in town.' },
        { day: 2, title: 'Bichanakandi and Panthumai', description: 'Full day west — Bichanakandi first, then Panthumai for the waterfall view across the border. Return in the late afternoon.' },
        { day: 3, title: 'Jaflong and Lalakhal', description: 'North to Jaflong and the Dawki river, then Lalakhal for the blue water and the tea gardens on the way back.' },
      ],
    },
    {
      slug: 'srimangal-slow-weekend',
      title: 'Srimangal Slow Weekend',
      destination: 'srimangal',
      media: 'srimangal',
      type: TourType.FLEXIBLE_DATE,
      durationDays: 3,
      duration: '3 days, 2 nights',
      basePrice: 9500,
      discountPrice: 8900,
      difficulty: Difficulty.EASY,
      featured: true,
      maxGroupSize: 10,
      shortDescription:
        'Tea gardens, rainforest and a Manipuri village, at whatever pace you want to take it.',
      description:
        'The same ground as our fixed Srimangal departure, but run privately on your dates and adjusted to whatever you actually care about — birds, tea, food or just being somewhere quiet.\n\nGood for families, couples and small groups of friends. There is no hard walking on this itinerary.',
      highlights:
        'Lawachara National Park with a certified naturalist\nWorking tea factory visit and tasting\nManipuri weaving village and a home-cooked dinner\nBaikka Beel wetland for migratory birds\nThe seven-layer tea, which you should try once',
      inclusions:
        'Estate bungalow accommodation, 2 nights\nDaily breakfast and one Manipuri dinner\nAll local transport\nPark entry and naturalist guide\nCycle hire for the estate loop',
      exclusions:
        'Train or coach to Srimangal\nLunches and remaining dinners\nBinocular hire\nPersonal expenses',
      accommodation: 'Tea estate bungalow, twin sharing',
      transport: 'Local transport, cycle rickshaw and bicycles within the estates',
      policies:
        'Full refund up to 7 days before the agreed start; 50% between 7 and 3 days; no refund inside 3 days.\n\nWildlife sightings are never guaranteed. We guarantee the guide, the timing and the access.',
      itinerary: [
        { day: 1, title: 'Arrival and tea estates', description: 'Check in at the bungalow, then an afternoon cycling loop through the gardens with a factory visit and tasting.' },
        { day: 2, title: 'Lawachara and Manipuri village', description: 'Dawn in Lawachara with a naturalist. Afternoon at the weaving village, dinner cooked by a Manipuri family.' },
        { day: 3, title: 'Baikka Beel and departure', description: 'Early boat at Baikka Beel, brunch at the bungalow, and an unhurried departure.' },
      ],
    },
    {
      slug: 'coxs-bazar-saint-martins-5d',
      title: "Cox's Bazar & Saint Martin's — 5 Days",
      destination: 'coxs-bazar',
      media: 'coxsbazar',
      type: TourType.FIXED_DATE,
      durationDays: 5,
      duration: '5 days, 4 nights',
      basePrice: 19500,
      discountPrice: 17500,
      difficulty: Difficulty.EASY,
      featured: false,
      maxGroupSize: 20,
      shortDescription:
        "The full southern coast — Marine Drive, Teknaf, and two nights on Saint Martin's Island.",
      description:
        "The complete southern coastline, including the only coral island in the country.\n\nSaint Martin's access is seasonal and regulated — ferries typically run November to March, and the current rules cap overnight visitor numbers. We confirm availability before taking payment and will tell you honestly if the island portion cannot run.\n\nThe rest of the itinerary stands on its own regardless.",
      highlights:
        "Two nights on Saint Martin's Island\nChhera Dwip by local boat, conditions permitting\nThe full Marine Drive to Teknaf\nInani rock beach and Patuartek at sunset\nHimchari waterfall and viewpoint",
      inclusions:
        "AC coach from Dhaka, both ways\nFerry to and from Saint Martin's\n4 nights accommodation\nDaily breakfast and 2 seafood dinners\nAll ground transport\nGuide throughout",
      exclusions:
        "Chhera Dwip boat hire (weather-dependent, paid locally)\nRemaining meals\nPersonal expenses\nTravel insurance",
      accommodation: "Cox's Bazar beachfront hotel (2 nights), Saint Martin's beach resort (2 nights)",
      transport: 'AC coach, private vehicle on Marine Drive, passenger ferry to the island',
      policies:
        "Saint Martin's travel is governed by regulations that change season to season. If the island portion cannot legally run, we refund that portion in full and offer an alternative for those nights.\n\nFull refund up to 21 days before departure; 50% between 21 and 10 days; no refund inside 10 days.",
      itinerary: [
        { day: 1, title: "Dhaka → Cox's Bazar", description: 'Overnight coach, arrive mid-morning, check in and rest. Afternoon on Laboni beach and sunset at Sugandha.' },
        { day: 2, title: 'Marine Drive to Teknaf', description: 'The full drive south — Himchari, Inani, Patuartek — ending at Teknaf. Overnight in Teknaf ready for the morning ferry.' },
        { day: 3, title: "Teknaf → Saint Martin's", description: "Morning ferry across. Check in, then the west beach for sunset. Seafood dinner on the island." },
        { day: 4, title: "Chhera Dwip and island day", description: 'Local boat to Chhera Dwip if conditions allow, otherwise a cycle circuit of the island. Second night on Saint Martin’s.' },
        { day: 5, title: "Return to Dhaka", description: "Afternoon ferry back to Teknaf, transfer to Cox's Bazar, and the night coach to Dhaka." },
      ],
    },
    {
      slug: 'custom-hill-tracts',
      title: 'Custom Hill Tracts Journey',
      destination: 'bandarban',
      media: 'trek',
      type: TourType.CUSTOMIZABLE,
      durationDays: 5,
      duration: 'From 3 days — you decide',
      basePrice: 13000,
      discountPrice: null,
      difficulty: Difficulty.MODERATE,
      featured: false,
      maxGroupSize: 30,
      shortDescription:
        'Build your own Hill Tracts route — we handle permits, guides, transport and homestays.',
      description:
        'A framework rather than a fixed itinerary. Tell us your dates, group size, fitness and how hard you want to walk, and we build the route.\n\nThis is what we use for corporate groups, university trips, photography expeditions and families who want the hills at their own pace.\n\nThe base price is indicative for a group of 10 over 5 days. We quote properly once we know what you actually want.',
      highlights:
        'Any combination of Bandarban, Rangamati and Khagrachari\nPermits and army registration handled entirely by us\nHomestay, guesthouse or resort accommodation as you prefer\nOptional trekking days from easy to genuinely hard\nGroup sizes from 4 to 30',
      inclusions:
        'Route planning and a written itinerary\nAll permits and registration\nGuides and local coordinators\nGround transport\nAccommodation as agreed',
      exclusions:
        'Travel to and from the region unless requested\nMeals not specified in your final itinerary\nPersonal equipment\nTravel insurance',
      accommodation: 'Your choice — homestay, guesthouse, resort or camping',
      transport: 'Arranged to suit the group and the route',
      policies:
        'Custom journeys are quoted individually and confirmed with a written itinerary and a deposit.\n\nCancellation terms are set out in your quote and depend on what has been committed on your behalf.\n\nMinimum 4 travellers.',
      itinerary: [
        { day: 1, title: 'You tell us the shape', description: 'Dates, group size, budget, fitness, and what you want out of it. A 20-minute call is usually enough.' },
        { day: 2, title: 'We send a real itinerary', description: 'Day by day, with accommodation named, transport specified and an itemised quote. Not a brochure.' },
        { day: 3, title: 'You adjust it', description: 'As many rounds as it takes. Nothing is charged until you are happy with the plan.' },
        { day: 4, title: 'We arrange everything', description: 'Permits, guides, vehicles, homestays. You get a final document with every contact number you might need.' },
        { day: 5, title: 'You travel', description: 'With a coordinator reachable throughout, and a team that knows where you are.' },
      ],
    },
  ];

  for (const item of tours) {
    const tour = await prisma.tour.upsert({
      where: { slug: item.slug },
      create: {
        title: item.title,
        slug: item.slug,
        shortDescription: item.shortDescription,
        description: item.description,
        destinationId: destinations.get(item.destination) ?? null,
        tourType: item.type,
        coverMediaId: media.get(item.media) ?? null,
        duration: item.duration,
        durationDays: item.durationDays,
        basePrice: item.basePrice,
        discountPrice: item.discountPrice,
        highlights: item.highlights,
        inclusions: item.inclusions,
        exclusions: item.exclusions,
        accommodation: item.accommodation,
        transport: item.transport,
        policies: item.policies,
        maxGroupSize: item.maxGroupSize,
        difficulty: item.difficulty,
        featured: item.featured,
        status: ContentStatus.PUBLISHED,
        seoTitle: `${item.title} — Tour Package`,
        seoDescription: item.shortDescription,
      },
      update: {
        shortDescription: item.shortDescription,
        description: item.description,
        basePrice: item.basePrice,
        discountPrice: item.discountPrice,
        featured: item.featured,
        status: ContentStatus.PUBLISHED,
      },
      select: { id: true },
    });

    await prisma.tourItinerary.deleteMany({ where: { tourId: tour.id } });
    await prisma.tourItinerary.createMany({
      data: item.itinerary.map((day, index) => ({
        tourId: tour.id,
        dayNumber: day.day,
        title: day.title,
        description: day.description,
        sortOrder: index,
      })),
    });
  }

  console.log(`  ${tours.length} tours`);
}

async function seedStays(destinations: Map<string, string>, media: Map<string, string>) {
  console.log('→ stays');

  const stays = [
    {
      slug: 'cloud-ridge-resort-sajek',
      name: 'Cloud Ridge Resort',
      type: AccommodationType.RESORT,
      destination: 'sajek-valley',
      media: 'resort',
      featured: true,
      address: 'Ruilui Para, Sajek Valley, Rangamati',
      shortDescription: 'Ridge-facing rooms with a balcony over the valley, five minutes from Konglak.',
      description:
        'Built on the eastern edge of the ridge, so every room faces the valley the clouds fill. The balconies are the reason to stay here.\n\nPower runs on a generator schedule, as everywhere in Sajek. Water is trucked up. Both are normal for the valley and worth knowing before you arrive.',
      amenities: 'Valley-facing balcony\nHot water (scheduled)\nRestaurant\nBonfire area\nGenerator power\nParking',
      rules: 'Check-in from 12:00, check-out by 11:00\nQuiet hours from 22:30\nNo outside alcohol\nUse water sparingly — it is trucked in',
      policies: 'Free cancellation up to 7 days before check-in. 50% charge inside 7 days. No refund for no-shows.',
      rooms: [
        { name: 'Valley View Twin', capacity: 2, price: 5500, units: 8, media: 'resort', amenities: 'Balcony\nTwin beds\nAttached bathroom\nHot water', description: 'Two single beds and a balcony facing the valley.' },
        { name: 'Valley View Double', capacity: 2, price: 6500, units: 6, media: 'resort', amenities: 'Balcony\nDouble bed\nAttached bathroom\nHot water', description: 'One double bed, the same view, slightly larger.' },
        { name: 'Family Suite', capacity: 5, price: 11000, units: 3, media: 'resort', amenities: 'Two rooms\nLarge balcony\nSitting area\nHot water', description: 'Two connected rooms for families or small groups.' },
      ],
    },
    {
      slug: 'hill-canopy-treehouse-bandarban',
      name: 'Hill Canopy Treehouse',
      type: AccommodationType.TREEHOUSE,
      destination: 'bandarban',
      media: 'treehouse',
      featured: true,
      address: 'Chimbuk Road, Bandarban Sadar',
      shortDescription: 'Four timber treehouses on the Chimbuk ridge, built with local carpenters.',
      description:
        'Four independent treehouses set apart from each other on a wooded slope off the Chimbuk road. Built by Marma carpenters using local timber.\n\nThere is no television and the wifi is unreliable. That is the point. Meals are cooked on site by the family who look after the property.',
      amenities: 'Private deck\nOutdoor shower\nHome-cooked meals\nSolar lighting\nHammocks\nBonfire on request',
      rules: 'Check-in from 14:00, check-out by 11:00\nNo loud music — the treehouses are close together\nMeals must be ordered by 17:00 for dinner',
      policies: 'Free cancellation up to 10 days before check-in. 50% charge inside 10 days.',
      rooms: [
        { name: 'Canopy Treehouse', capacity: 2, price: 7500, units: 3, media: 'treehouse', amenities: 'Private deck\nOutdoor shower\nSolar light\nMosquito net', description: 'One double bed, a deck facing the ridge, and no walls between you and the sound of the hills.' },
        { name: 'Family Treehouse', capacity: 4, price: 12500, units: 1, media: 'treehouse', amenities: 'Two levels\nLarge deck\nIndoor bathroom\nSitting area', description: 'The largest of the four, on two levels, with an indoor bathroom.' },
      ],
    },
    {
      slug: 'tea-bungalow-srimangal',
      name: 'Tea Estate Bungalow',
      type: AccommodationType.HOMESTAY,
      destination: 'srimangal',
      media: 'homestay',
      featured: true,
      address: 'Bhurbhuria Tea Estate, Srimangal, Moulvibazar',
      shortDescription: 'A restored planter’s bungalow inside a working tea estate, with a wide verandah.',
      description:
        'A colonial-era bungalow on a working estate, restored rather than modernised. High ceilings, a deep verandah, and tea in every direction.\n\nThe caretaker family cooks, and the food is excellent. Lawachara is twenty minutes away, Baikka Beel forty.',
      amenities: 'Wide verandah\nGarden\nHome-cooked meals\nAir conditioning\nWorking fireplace\nBicycles',
      rules: 'Check-in from 14:00, check-out by 12:00\nEstate roads close after dark\nPlease do not pick tea leaves — it is a working estate',
      policies: 'Free cancellation up to 7 days before check-in. 50% charge inside 7 days.',
      rooms: [
        { name: 'Verandah Room', capacity: 2, price: 6000, units: 4, media: 'homestay', amenities: 'Verandah access\nAir conditioning\nAttached bathroom\nGarden view', description: 'Opens directly onto the main verandah.' },
        { name: 'Garden Suite', capacity: 4, price: 9500, units: 2, media: 'homestay', amenities: 'Sitting room\nAir conditioning\nGarden access\nTwo bedrooms', description: 'Two bedrooms and a sitting room, opening onto the garden.' },
      ],
    },
    {
      slug: 'beachfront-cove-coxs-bazar',
      name: 'Beachfront Cove Hotel',
      type: AccommodationType.HOTEL,
      destination: 'coxs-bazar',
      media: 'coxsbazar',
      featured: false,
      address: 'Kolatoli Road, Cox’s Bazar',
      shortDescription: 'A straightforward beachfront hotel south of the busiest stretch of sand.',
      description:
        "Far enough south of Laboni to be quiet, close enough to walk in. Sea-view rooms face directly onto the beach.\n\nNothing exotic — a well-run hotel with reliable hot water, a decent breakfast and a rooftop that catches the evening breeze.",
      amenities: 'Sea-view rooms\nRooftop restaurant\nAir conditioning\n24-hour front desk\nLaundry\nParking',
      rules: 'Check-in from 14:00, check-out by 12:00\nValid photo ID required at check-in\nNo cooking in rooms',
      policies: 'Free cancellation up to 3 days before check-in. One night charged inside 3 days.',
      rooms: [
        { name: 'City View Double', capacity: 2, price: 4500, units: 12, media: 'coxsbazar', amenities: 'Air conditioning\nAttached bathroom\nTV\nHot water', description: 'Comfortable double facing inland.' },
        { name: 'Sea View Double', capacity: 2, price: 6500, units: 10, media: 'coxsbazar', amenities: 'Sea view\nBalcony\nAir conditioning\nHot water', description: 'Balcony facing directly onto the beach.' },
        { name: 'Sea View Family', capacity: 4, price: 9500, units: 5, media: 'coxsbazar', amenities: 'Sea view\nTwo double beds\nBalcony\nAir conditioning', description: 'Two double beds and a balcony, for families.' },
      ],
    },
    {
      slug: 'haor-houseboat-sunamganj',
      name: 'Tanguar Haor Houseboat',
      type: AccommodationType.CAMP,
      destination: 'sylhet',
      media: 'boat',
      featured: false,
      address: 'Tahirpur Ghat, Sunamganj',
      shortDescription: 'A traditional wooden houseboat, chartered by cabin or in full.',
      description:
        'A two-deck wooden houseboat that moors overnight inside the haor. Cabins below, open deck above.\n\nThe boat does not have hot water and the bathrooms are basic. In exchange you sleep in the middle of a wetland with nothing but water in every direction.',
      amenities: 'Open upper deck\nAll meals aboard\nLife jackets\nSolar lighting\nMattress bedding\nBoatman and cook',
      rules: 'Boarding at Tahirpur only\nLife jackets mandatory on the open water\nNo sailing under storm warning\nMinimum 2-night charter in peak season',
      policies: 'Free cancellation up to 7 days before boarding. Weather cancellations are refunded in full at any time.',
      rooms: [
        { name: 'Deck Berth', capacity: 2, price: 3500, units: 6, media: 'boat', amenities: 'Shared deck\nMattress bedding\nMosquito net\nLife jacket', description: 'A berth on the covered upper deck. The best air, the least privacy.' },
        { name: 'Enclosed Cabin', capacity: 2, price: 5500, units: 4, media: 'boat', amenities: 'Private cabin\nLockable door\nMattress bedding\nFan', description: 'A private cabin below deck with a lockable door.' },
      ],
    },
  ];

  for (const item of stays) {
    const stay = await prisma.accommodation.upsert({
      where: { slug: item.slug },
      create: {
        name: item.name,
        slug: item.slug,
        type: item.type,
        destinationId: destinations.get(item.destination) ?? null,
        coverMediaId: media.get(item.media) ?? null,
        address: item.address,
        shortDescription: item.shortDescription,
        description: item.description,
        amenities: item.amenities,
        rules: item.rules,
        policies: item.policies,
        featured: item.featured,
        status: ContentStatus.PUBLISHED,
        seoTitle: `${item.name} — ${item.address}`,
        seoDescription: item.shortDescription,
      },
      update: {
        shortDescription: item.shortDescription,
        description: item.description,
        featured: item.featured,
        status: ContentStatus.PUBLISHED,
      },
      select: { id: true },
    });

    for (const room of item.rooms) {
      // Room types are keyed on (accommodation, name) via a deterministic id so
      // re-seeding updates rather than duplicating them.
      const roomId = `seed-room-${item.slug}-${room.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await prisma.roomType.upsert({
        where: { id: roomId },
        create: {
          id: roomId,
          accommodationId: stay.id,
          name: room.name,
          description: room.description,
          capacity: room.capacity,
          price: room.price,
          totalUnits: room.units,
          amenities: room.amenities,
          coverMediaId: media.get(room.media) ?? null,
          status: ContentStatus.PUBLISHED,
        },
        update: {
          price: room.price,
          totalUnits: room.units,
          capacity: room.capacity,
          status: ContentStatus.PUBLISHED,
        },
      });
    }
  }

  console.log(`  ${stays.length} properties`);
}

async function seedVisa() {
  console.log('→ visa');

  const countries = [
    {
      slug: 'thailand',
      name: 'Thailand',
      code: 'TH',
      description: 'Tourist and business visas for Bangladeshi passport holders, filed through the Royal Thai Embassy in Dhaka.',
      types: [
        {
          slug: 'tourist-visa',
          name: 'Tourist Visa',
          title: 'Thailand Tourist Visa for Bangladeshi Passport Holders',
          serviceFee: 4500,
          summary:
            'A single-entry tourist visa valid for 60 days from the date of entry, issued by the Royal Thai Embassy in Dhaka.\n\nProcessing normally takes 5 to 7 working days from the date of submission, though the embassy can take longer during peak season. Your passport stays with the embassy for the duration.\n\nWe prepare the file, check every document against the current checklist, book the submission slot and hand your passport back to you when it returns.',
          importantNotes:
            'Your passport must have at least 6 months validity remaining from the date of travel, and two blank facing pages.\nBank statements must be original, stamped and signed by the bank — printed PDFs are rejected.\nThe embassy can request an interview at its discretion. This is uncommon but does happen.\nApproval is entirely the embassy’s decision. No agency can guarantee it, and anyone who does is lying to you.\nApply at least 3 weeks before travel. Peak season queues are long.',
          generalDocuments:
            'Original passport, valid for 6+ months with 2 blank facing pages\nCompleted and signed visa application form\nTwo recent passport-size photographs, 35×45mm, white background, taken within the last 6 months\nConfirmed return air ticket booking\nHotel booking confirmation covering the full stay\nBank statement for the last 6 months, original, bank-stamped and signed\nBank solvency certificate\nNational ID card copy\nDay-by-day travel itinerary',
          businessOwnerDocuments:
            'Valid trade licence with an English translation\nTIN certificate and the latest income tax return acknowledgement\nCompany bank statement for the last 6 months, bank-stamped\nCompany letterhead pad and visiting card\nMemorandum of Association, for limited companies\nBank solvency certificate in the company name',
          studentDocuments:
            'Student ID card copy\nCurrent enrolment certificate from the institution\nLeave or no-objection letter from the institution\nSponsor’s bank statement for the last 6 months, bank-stamped\nSponsor’s solvency certificate and profession proof\nNotarised affidavit of sponsorship, where the sponsor is not a parent',
          otherApplicantDocuments:
            'Employed applicants: employment certificate, salary certificate, NOC from employer, and salary account statement\nRetired applicants: pension book copy and pension account statement\nHousewives: spouse’s complete document set plus a marriage certificate\nFreelancers: contracts, invoices and a 6-month bank statement showing regular income',
          softCopyInstructions:
            'Email clear scans of every document to visa@wildpeaksouls.com with your full name and intended travel date in the subject line. Scans must be legible, in colour, and at least 300 DPI. We review the set and tell you exactly what is missing before you submit anything physically — this is the step that prevents most rejections.',
          hardCopyInstructions:
            'Once the soft-copy review is clear, bring the original passport and the complete physical file to our Banani office, or send it by a tracked courier. We check the file again, submit it at the embassy on the scheduled date, and return your passport in person or by courier when it comes back. We never ask for your passport before the file is complete.',
          processingInfo:
            'Embassy processing: 5–7 working days from submission.\nOur document review: 1–2 working days.\nTotal realistic timeline: 2 to 3 weeks from first contact to passport back in your hand.\nExpress processing is not available for Bangladeshi passport holders on tourist visas.',
          additionalInfo:
            'The embassy fee is paid separately and is non-refundable regardless of outcome.\nOur service fee covers document review, file preparation, appointment booking and submission.\nIf the visa is refused we will tell you the stated reason and advise honestly on whether reapplying makes sense.',
        },
        {
          slug: 'business-visa',
          name: 'Business Visa',
          title: 'Thailand Business Visa (Non-Immigrant B)',
          serviceFee: 6500,
          summary:
            'A Non-Immigrant B visa for business meetings, conferences and trade visits. Requires an invitation from a Thai company or organisation.\n\nProcessing takes 7 to 10 working days. Single and multiple entry options are available depending on the invitation and your travel history.',
          importantNotes:
            'A genuine invitation letter from the Thai side is mandatory and must be on company letterhead.\nThe Thai company’s registration documents are usually required alongside the invitation.\nThis visa does not permit employment in Thailand — a work permit is a separate process.\nMultiple-entry issuance depends on your travel history and is at the embassy’s discretion.',
          generalDocuments:
            'Original passport, valid for 6+ months\nCompleted Non-Immigrant B application form\nTwo passport-size photographs, 35×45mm\nInvitation letter from the Thai company on letterhead\nThai company registration certificate copy\nYour company’s introduction letter stating the purpose and duration\nConfirmed return ticket booking\nBank statement for the last 6 months, bank-stamped',
          businessOwnerDocuments:
            'Trade licence with English translation\nTIN certificate and latest tax return\nCompany bank statement, 6 months, bank-stamped\nCompany profile or brochure\nMemorandum and Articles of Association\nBoard resolution authorising the trip, for limited companies',
          studentDocuments:
            'Not applicable — students should apply for a tourist visa unless attending a specific conference, in which case the conference invitation replaces the company invitation.',
          otherApplicantDocuments:
            'Employees travelling on company business: employer’s letter stating designation, salary and purpose of travel, plus a board or management authorisation\nConsultants: contract with the Thai party and proof of professional registration',
          softCopyInstructions:
            'Email the invitation letter and all supporting scans to visa@wildpeaksouls.com. Business files are checked more strictly than tourist files — we review the invitation wording specifically, since a vague invitation is the single most common reason for refusal.',
          hardCopyInstructions:
            'Submit the original passport with the complete file at our office. Business applications sometimes attract an embassy interview; if so, we brief you on what will be asked before the date.',
          processingInfo:
            'Embassy processing: 7–10 working days.\nAllow 3 to 4 weeks in total from first contact.\nMultiple-entry applications can take longer.',
          additionalInfo:
            'Embassy fees differ between single and multiple entry and are paid separately.\nWe can help draft the invitation request to the Thai company if you have a contact but no letter yet.',
        },
      ],
    },
    {
      slug: 'malaysia',
      name: 'Malaysia',
      code: 'MY',
      description: 'eVISA and sticker visa support for Bangladeshi travellers heading to Malaysia.',
      types: [
        {
          slug: 'evisa',
          name: 'eVISA',
          title: 'Malaysia eVISA for Bangladeshi Passport Holders',
          serviceFee: 3500,
          summary:
            'A single-entry electronic visa allowing a stay of up to 30 days, applied for entirely online.\n\nProcessing usually takes 3 to 5 working days. Your passport is not surrendered — this is the main advantage over a sticker visa.',
          importantNotes:
            'The passport must be valid for at least 6 months from the date of arrival.\nAll uploaded scans must be in colour and clearly legible; blurred uploads are the most common rejection reason.\nThe eVISA must be printed and carried — immigration will ask for it on arrival.\nEntry remains at the discretion of the Malaysian immigration officer even with a valid eVISA.\nThe eVISA is valid for 3 months from issue; you must enter within that window.',
          generalDocuments:
            'Passport scan of the bio-data page, in colour\nRecent passport-size photograph, white background, digital copy\nConfirmed return air ticket\nHotel booking confirmation for the full stay\nBank statement for the last 3 months\nBank solvency certificate\nNational ID card scan',
          businessOwnerDocuments:
            'Trade licence scan with English translation\nTIN certificate\nCompany bank statement, 3 months\nCompany introduction letter',
          studentDocuments:
            'Student ID card scan\nEnrolment certificate\nInstitution leave letter\nSponsor’s bank statement, 3 months, and solvency certificate',
          otherApplicantDocuments:
            'Employed: employment certificate and NOC from employer\nHousewives: spouse’s documents and marriage certificate\nRetired: pension documentation',
          softCopyInstructions:
            'Everything for an eVISA is digital. Email your scans to visa@wildpeaksouls.com and we file the application on your behalf. We check image quality before uploading, because a rejected upload costs you the fee and the time.',
          hardCopyInstructions:
            'No hard copies and no passport submission are required for the eVISA. Print the approved eVISA and carry it with your passport when you travel.',
          processingInfo:
            'Online processing: 3–5 working days.\nOur document check: same day in most cases.\nTotal: usually within one week.',
          additionalInfo:
            'The Malaysian government fee is non-refundable if the application is rejected.\nIf you need a longer stay or multiple entries, a sticker visa through the High Commission is the correct route — ask us and we will advise.',
        },
      ],
    },
    {
      slug: 'india',
      name: 'India',
      code: 'IN',
      description: 'Tourist and medical visa assistance for the Indian High Commission in Dhaka.',
      types: [
        {
          slug: 'tourist-visa',
          name: 'Tourist Visa',
          title: 'India Tourist Visa for Bangladeshi Passport Holders',
          serviceFee: 3000,
          summary:
            'A tourist visa for travel to India, applied for online and submitted at an Indian Visa Application Centre.\n\nProcessing times vary considerably with the season and the centre. Appointment availability is often the longest part of the process, not the decision itself.',
          importantNotes:
            'The online form must be completed exactly as it appears in your passport — a single mismatch causes rejection.\nAppointment slots are released in batches and go quickly. Apply well in advance.\nPort of entry and exit are specified on the application and matter at immigration.\nThe visa fee is paid online and is non-refundable.\nApproval is entirely at the discretion of the High Commission.',
          generalDocuments:
            'Original passport, valid for 6+ months with 2 blank pages\nOnline application form printout with the appointment confirmation\nOne recent photograph, 2×2 inches, white background\nNational ID card copy\nUtility bill copy as proof of address, no older than 3 months\nBank statement for the last 6 months or a dollar endorsement\nConfirmed travel plan',
          businessOwnerDocuments:
            'Trade licence with English translation\nTIN certificate and latest tax return\nCompany bank statement, 6 months\nCompany letterhead pad and visiting card',
          studentDocuments:
            'Student ID card copy\nEnrolment or bonafide certificate from the institution\nParent or guardian’s bank statement and solvency certificate\nParent’s NID copy',
          otherApplicantDocuments:
            'Employed: employment certificate and salary account statement\nMedical visa applicants: hospital appointment letter from the Indian hospital and local doctor’s referral\nHousewives: spouse’s complete document set and marriage certificate\nRetired: pension book and pension account statement',
          softCopyInstructions:
            'Send scans of your passport, NID and financial documents to visa@wildpeaksouls.com. We complete the online form on your behalf, check every field against your passport, and secure the earliest available appointment slot.',
          hardCopyInstructions:
            'You must attend the Indian Visa Application Centre in person for biometrics — this cannot be delegated. We prepare the complete physical file, brief you on what happens at the centre, and accompany you where the centre permits.',
          processingInfo:
            'Appointment availability: highly variable, often 2–4 weeks out.\nProcessing after submission: typically 5–10 working days.\nPlan on 4 to 6 weeks in total during peak season.',
          additionalInfo:
            'Medical visas follow a different document set and are usually processed faster — contact us directly for those.\nOur fee covers form completion, document review, appointment booking and file preparation.',
        },
      ],
    },
    {
      slug: 'nepal',
      name: 'Nepal',
      code: 'NP',
      description: 'Visa-on-arrival guidance and trekking permit support for Nepal.',
      types: [
        {
          slug: 'visa-on-arrival',
          name: 'Visa on Arrival',
          title: 'Nepal Visa on Arrival for Bangladeshi Passport Holders',
          serviceFee: 1500,
          summary:
            'Bangladeshi passport holders can obtain a visa on arrival at Tribhuvan International Airport and at land borders.\n\nThis is genuinely straightforward, and our fee covers preparation and trekking permit support rather than the visa itself — we will tell you plainly that you do not need us for the visa alone.',
          importantNotes:
            'Passport must be valid for at least 6 months.\nThe visa fee is payable in cash at the airport — USD is easiest, and small notes help.\nFill the arrival form at the kiosk before joining the queue; it moves much faster.\nTrekking in Annapurna or Everest regions requires TIMS and a conservation area permit, which are separate from the visa.\nOverstaying carries a daily fine, strictly enforced.',
          generalDocuments:
            'Passport valid for 6+ months\nOne passport-size photograph\nCompleted arrival form, available at the airport kiosk\nVisa fee in cash (USD preferred)\nProof of onward or return travel\nHotel booking or address in Nepal',
          businessOwnerDocuments:
            'Not required for a tourist visa on arrival. Business travellers should carry a company introduction letter for immigration questions.',
          studentDocuments:
            'Not required for a tourist visa on arrival. Carry a student ID if you intend to claim any student concessions at sites.',
          otherApplicantDocuments:
            'Trekkers: TIMS card and the relevant conservation area permit, which we can arrange in advance\nVolunteers or researchers: the appropriate visa category applies — contact us, as visa on arrival is not correct for those purposes',
          softCopyInstructions:
            'For the visa itself, nothing needs to be sent in advance. If you want us to arrange trekking permits before you fly, email your passport scan and photograph to visa@wildpeaksouls.com at least 10 days before departure.',
          hardCopyInstructions:
            'No submission is required. Carry the physical photograph and cash fee with you — the airport ATMs are unreliable and the queue does not accept cards.',
          processingInfo:
            'Visa on arrival: issued at the airport, typically 20–40 minutes depending on the queue.\nTrekking permits arranged in advance: 5–7 working days.',
          additionalInfo:
            'Visa fees are set by the Nepal Department of Immigration and vary by duration (15, 30 or 90 days).\nIf you only need the visa, you do not need an agency. We are upfront about that — our value here is the trekking permits and the ground arrangements.',
        },
      ],
    },
  ];

  let typeCount = 0;
  for (const [index, country] of countries.entries()) {
    const record = await prisma.visaCountry.upsert({
      where: { slug: country.slug },
      create: {
        name: country.name,
        slug: country.slug,
        code: country.code,
        description: country.description,
        sortOrder: index,
        status: ContentStatus.PUBLISHED,
      },
      update: { description: country.description, status: ContentStatus.PUBLISHED },
      select: { id: true },
    });

    for (const type of country.types) {
      await prisma.visaType.upsert({
        where: { countryId_slug: { countryId: record.id, slug: type.slug } },
        create: {
          countryId: record.id,
          name: type.name,
          slug: type.slug,
          title: type.title,
          summary: type.summary,
          importantNotes: type.importantNotes,
          generalDocuments: type.generalDocuments,
          businessOwnerDocuments: type.businessOwnerDocuments,
          studentDocuments: type.studentDocuments,
          otherApplicantDocuments: type.otherApplicantDocuments,
          softCopyInstructions: type.softCopyInstructions,
          hardCopyInstructions: type.hardCopyInstructions,
          processingInfo: type.processingInfo,
          additionalInfo: type.additionalInfo,
          serviceFee: type.serviceFee,
          status: ContentStatus.PUBLISHED,
          seoTitle: type.title,
          seoDescription: type.summary.split('\n')[0],
        },
        update: {
          title: type.title,
          summary: type.summary,
          importantNotes: type.importantNotes,
          generalDocuments: type.generalDocuments,
          serviceFee: type.serviceFee,
          status: ContentStatus.PUBLISHED,
        },
      });
      typeCount += 1;
    }
  }

  console.log(`  ${countries.length} countries, ${typeCount} visa types`);
}

async function seedTransport() {
  console.log('→ flights & trains');

  const airports = [
    { iata: 'DAC', name: 'Hazrat Shahjalal International Airport', city: 'Dhaka' },
    { iata: 'CGP', name: 'Shah Amanat International Airport', city: 'Chittagong' },
    { iata: 'CXB', name: "Cox's Bazar Airport", city: "Cox's Bazar" },
    { iata: 'ZYL', name: 'Osmani International Airport', city: 'Sylhet' },
    { iata: 'JSR', name: 'Jashore Airport', city: 'Jashore' },
    { iata: 'SPD', name: 'Saidpur Airport', city: 'Saidpur' },
    { iata: 'BZL', name: 'Barisal Airport', city: 'Barisal' },
    { iata: 'RJH', name: 'Shah Makhdum Airport', city: 'Rajshahi' },
  ];

  for (const airport of airports) {
    await prisma.airport.upsert({
      where: { iata: airport.iata },
      create: { ...airport, country: 'Bangladesh' },
      update: { name: airport.name, city: airport.city },
    });
  }

  const routes = [
    { airline: 'Biman Bangladesh Airlines', flightNumber: 'BG-435', from: 'DAC', to: 'CXB', dep: '08:15', arr: '09:25', mins: 70, price: 6800, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'US-Bangla Airlines', flightNumber: 'BS-141', from: 'DAC', to: 'CXB', dep: '10:40', arr: '11:50', mins: 70, price: 6200, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'Novoair', flightNumber: 'VQ-921', from: 'DAC', to: 'CXB', dep: '15:20', arr: '16:30', mins: 70, price: 6500, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'Biman Bangladesh Airlines', flightNumber: 'BG-436', from: 'CXB', to: 'DAC', dep: '10:05', arr: '11:15', mins: 70, price: 6800, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'US-Bangla Airlines', flightNumber: 'BS-142', from: 'CXB', to: 'DAC', dep: '12:30', arr: '13:40', mins: 70, price: 6200, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'Biman Bangladesh Airlines', flightNumber: 'BG-601', from: 'DAC', to: 'CGP', dep: '07:30', arr: '08:20', mins: 50, price: 5200, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'US-Bangla Airlines', flightNumber: 'BS-121', from: 'DAC', to: 'CGP', dep: '11:15', arr: '12:05', mins: 50, price: 4900, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'Novoair', flightNumber: 'VQ-901', from: 'DAC', to: 'ZYL', dep: '09:00', arr: '09:50', mins: 50, price: 5400, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'US-Bangla Airlines', flightNumber: 'BS-201', from: 'DAC', to: 'ZYL', dep: '16:45', arr: '17:35', mins: 50, price: 5100, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'Biman Bangladesh Airlines', flightNumber: 'BG-491', from: 'DAC', to: 'SPD', dep: '12:00', arr: '13:00', mins: 60, price: 5600, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'US-Bangla Airlines', flightNumber: 'BS-171', from: 'DAC', to: 'JSR', dep: '08:45', arr: '09:30', mins: 45, price: 4700, baggage: '20 kg checked, 7 kg cabin' },
    { airline: 'Novoair', flightNumber: 'VQ-951', from: 'DAC', to: 'BZL', dep: '14:10', arr: '14:55', mins: 45, price: 4800, baggage: '20 kg checked, 7 kg cabin' },
  ];

  for (const route of routes) {
    await prisma.flightRoute.upsert({
      where: {
        flightNumber_originIata_destinationIata: {
          flightNumber: route.flightNumber,
          originIata: route.from,
          destinationIata: route.to,
        },
      },
      create: {
        airline: route.airline,
        flightNumber: route.flightNumber,
        originIata: route.from,
        destinationIata: route.to,
        departureTime: route.dep,
        arrivalTime: route.arr,
        durationMinutes: route.mins,
        stops: 0,
        baggage: route.baggage,
        indicativePrice: route.price,
        source: 'AGENCY_MANAGED',
        sourceUpdatedAt: new Date(),
        active: true,
      },
      update: {
        indicativePrice: route.price,
        departureTime: route.dep,
        arrivalTime: route.arr,
        sourceUpdatedAt: new Date(),
      },
    });
  }

  const trains = [
    { name: 'Subarna Express', number: '701', from: 'Dhaka', to: 'Chattogram', dep: '16:30', arr: '21:50', mins: 320, off: 'Monday', stops: 'Dhaka Biman Bandar, Cumilla, Feni', classes: 'S_CHAIR, SNIGDHA' },
    { name: 'Sonar Bangla Express', number: '787', from: 'Dhaka', to: 'Chattogram', dep: '07:00', arr: '12:20', mins: 320, off: 'Tuesday', stops: 'Dhaka Biman Bandar, Cumilla', classes: 'S_CHAIR, SNIGDHA, AC_S' },
    { name: 'Mahanagar Provati', number: '703', from: 'Dhaka', to: 'Chattogram', dep: '07:45', arr: '14:00', mins: 375, off: 'None', stops: 'Dhaka Biman Bandar, Bhairab, Cumilla, Feni', classes: 'SHOVAN, S_CHAIR, SNIGDHA' },
    { name: 'Parabat Express', number: '709', from: 'Dhaka', to: 'Sylhet', dep: '06:20', arr: '13:00', mins: 400, off: 'Tuesday', stops: 'Dhaka Biman Bandar, Bhairab, Srimangal, Sreemangal', classes: 'S_CHAIR, SNIGDHA' },
    { name: 'Joyantika Express', number: '717', from: 'Dhaka', to: 'Sylhet', dep: '11:15', arr: '19:00', mins: 465, off: 'None', stops: 'Bhairab, Brahmanbaria, Srimangal', classes: 'SHOVAN, S_CHAIR' },
    { name: 'Kalni Express', number: '773', from: 'Dhaka', to: 'Sylhet', dep: '14:45', arr: '21:30', mins: 405, off: 'Friday', stops: 'Dhaka Biman Bandar, Srimangal', classes: 'S_CHAIR, SNIGDHA' },
    { name: 'Ekota Express', number: '705', from: 'Dhaka', to: 'Panchagarh', dep: '10:10', arr: '20:50', mins: 640, off: 'None', stops: 'Joydebpur, Ishwardi, Natore, Santahar, Dinajpur', classes: 'SHOVAN, S_CHAIR, AC_B' },
    { name: 'Nilsagar Express', number: '765', from: 'Dhaka', to: 'Chilahati', dep: '06:45', arr: '16:05', mins: 560, off: 'Monday', stops: 'Joydebpur, Ishwardi, Santahar, Saidpur', classes: 'S_CHAIR, SNIGDHA, AC_B' },
    { name: 'Sundarban Express', number: '725', from: 'Dhaka', to: 'Khulna', dep: '08:15', arr: '17:40', mins: 565, off: 'Tuesday', stops: 'Faridpur, Rajbari, Jashore', classes: 'S_CHAIR, SNIGDHA' },
    { name: 'Benapole Express', number: '795', from: 'Dhaka', to: 'Benapole', dep: '23:15', arr: '07:00', mins: 465, off: 'Wednesday', stops: 'Faridpur, Jashore', classes: 'S_CHAIR, SNIGDHA, AC_S' },
    { name: 'Silkcity Express', number: '753', from: 'Dhaka', to: 'Rajshahi', dep: '14:45', arr: '20:35', mins: 350, off: 'Sunday', stops: 'Joydebpur, Ishwardi, Natore', classes: 'S_CHAIR, SNIGDHA' },
    { name: 'Subarna Express', number: '702', from: 'Chattogram', to: 'Dhaka', dep: '07:00', arr: '12:20', mins: 320, off: 'Monday', stops: 'Feni, Cumilla, Dhaka Biman Bandar', classes: 'S_CHAIR, SNIGDHA' },
    { name: 'Parabat Express', number: '710', from: 'Sylhet', to: 'Dhaka', dep: '15:00', arr: '21:35', mins: 395, off: 'Tuesday', stops: 'Srimangal, Bhairab, Dhaka Biman Bandar', classes: 'S_CHAIR, SNIGDHA' },
  ];

  for (const train of trains) {
    const id = `seed-train-${train.number}-${train.from.toLowerCase()}`;
    await prisma.trainSchedule.upsert({
      where: { id },
      create: {
        id,
        trainName: train.name,
        trainNumber: train.number,
        originStation: train.from,
        destinationStation: train.to,
        departureTime: train.dep,
        arrivalTime: train.arr,
        durationMinutes: train.mins,
        offDay: train.off === 'None' ? null : train.off,
        routeStops: train.stops,
        classesAvailable: train.classes,
        source: 'BANGLADESH_RAILWAY_PUBLIC',
        sourceUpdatedAt: new Date(),
        active: true,
      },
      update: {
        departureTime: train.dep,
        arrivalTime: train.arr,
        offDay: train.off === 'None' ? null : train.off,
        sourceUpdatedAt: new Date(),
      },
    });
  }

  console.log(`  ${airports.length} airports, ${routes.length} flight routes, ${trains.length} train services`);
}

async function seedContent(media: Map<string, string>) {
  console.log('→ content');

  const services = [
    { slug: 'tour-planning', title: 'Tour Planning', icon: 'Map', summary: 'Full itinerary design for any destination we operate in.', description: 'Route design based on your dates and fitness\nAccommodation booked and confirmed on your behalf\nGround transport arranged end to end\nWritten day-by-day itinerary before you pay\nA coordinator reachable throughout your trip' },
    { slug: 'group-trips', title: 'Group Departures', icon: 'Users', summary: 'Fixed-date trips with set prices and capped group sizes.', description: 'Published departure dates you can book onto\nGroup sizes capped deliberately, not by accident\nAll logistics handled — you turn up at the meeting point\nSolo travellers welcome on every departure\nPrice held from the moment you book' },
    { slug: 'custom-tours', title: 'Custom Tours', icon: 'Sparkles', summary: 'Trips built around your dates, budget and travel style.', description: 'Private itineraries for 2 to 200 travellers\nCorporate offsites and team retreats\nSchool and university educational trips\nPhotography and film logistics\nNo charge until you approve the plan' },
    { slug: 'stay-assistance', title: 'Accommodation Booking', icon: 'BedDouble', summary: 'Resorts, homestays, treehouses and camps we know personally.', description: 'Properties we have visited and vetted\nLive per-night availability on listed stays\nGroup block bookings\nAccessible room requests handled directly\nProperties we do not list can still be arranged' },
    { slug: 'visa-assistance', title: 'Visa Assistance', icon: 'FileCheck2', summary: 'Document review, file preparation and submission support.', description: 'Country-specific document checklists\nSoft-copy review before you submit anything\nAppointment booking where required\nFile preparation and embassy submission\nHonest advice on your chances — we will tell you if it is weak' },
    { slug: 'transport', title: 'Transport', icon: 'Bus', summary: 'Coaches, chander gari, private vehicles and boats.', description: 'AC and non-AC coach bookings\nPrivate vehicles with vetted drivers\nChander gari for hill routes\nCountry boats and houseboats\nAirport transfers' },
    { slug: 'travel-consultation', title: 'Travel Consultation', icon: 'MessageCircle', summary: 'A conversation before you commit to anything.', description: 'Route and season advice for your dates\nRealistic budget planning\nFitness and difficulty assessment\nPermit and documentation guidance\nFree — we do not charge for a first conversation' },
    { slug: 'corporate-travel', title: 'Corporate Travel', icon: 'Briefcase', summary: 'Offsites, retreats and team trips with proper invoicing.', description: 'Groups from 10 to 200\nProper invoicing and documentation for your finance team\nRisk assessment and safety briefing documentation\nDedicated on-ground coordinator\nPost-trip reporting where required' },
  ];

  for (const [index, service] of services.entries()) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      create: { ...service, sortOrder: index, status: ContentStatus.PUBLISHED },
      update: { summary: service.summary, description: service.description, sortOrder: index },
    });
  }

  const posts = [
    {
      slug: 'what-to-pack-for-a-hill-tracts-trek',
      title: 'What to Actually Pack for a Hill Tracts Trek',
      media: 'guide-packing',
      readMinutes: 7,
      tags: 'trekking,bandarban,gear',
      excerpt:
        'Most packing lists are written by people selling gear. This one is written by guides who carry what you forget.',
      body:
        "Every trekking packing list on the internet is too long. People arrive in Ruma with 18kg packs containing three jackets and a camping stove, and by the second morning they have paid a porter to carry most of it.\n\nHere is what actually matters on a Bandarban trek, in rough order of how much you will regret forgetting it.\n\n## Footwear, and nothing else comes close\n\nThe single biggest cause of a ruined trek is footwear. Not fitness, not weather — shoes.\n\nYou need trail shoes or light boots with genuine grip, broken in over at least 40km of walking before the trip. New boots bought the week before are a guarantee of blisters by day two. Bring the same pair you have been walking in, even if they look worn.\n\nBring flip-flops for the evenings. After eight hours in boots, this matters more than it sounds.\n\n## Layers, not bulk\n\nJanuary nights at Boga Lake get close to 8°C. Daytime on the trail in full sun is 26°C. You need both, and one thick jacket handles neither well.\n\nA thin base layer, a fleece, and a light windproof shell cover the entire range. Total weight under a kilo. Leave the heavy jacket at home.\n\n## Water and how you carry it\n\nTwo litres of capacity, minimum. Villages along the route will refill you, but the gaps between them are longer than you expect on the ridge.\n\nA bladder is more convenient than bottles because you drink more when you do not have to stop. Whether you use purification tablets is your call — the spring water at Boga is generally fine, but the tablets weigh nothing.\n\n## The small things that actually get used\n\nA headtorch. The summit start is in the dark and phone torches drain your battery when you most need it.\n\nA power bank. There is no charging on the trail and you will want your phone working for the descent.\n\nBlister plasters. Not regular plasters — the hydrocolloid kind. They are the difference between an uncomfortable day and an aborted trek.\n\nCash in small notes. There is no ATM past Ruma Bazar, and village shops cannot change a 1000-taka note.\n\n## What to leave behind\n\nJeans. They are heavy, they do not dry, and they chafe.\n\nA second pair of boots.\n\nMore than two changes of clothes — you will smell either way, and everyone else will too.\n\nA drone, unless you have checked. Much of the Hill Tracts is restricted airspace and confiscation is a real risk.\n\n## One last thing\n\nPack it, then walk 5km with it. Whatever annoys you in that 5km will make you miserable over four days. This test takes an hour and saves the trip.",
    },
    {
      slug: 'sajek-in-monsoon-versus-winter',
      title: 'Sajek in Monsoon or Winter: Which You Actually Want',
      media: 'guide-monsoon',
      readMinutes: 5,
      tags: 'sajek,seasons,planning',
      excerpt:
        'The clouds people come for and the views people expect happen in different months. Pick deliberately.',
      body:
        "People book Sajek having seen two completely different sets of photographs, and are surprised when they get one and not the other. The difference is the season, and it is worth choosing on purpose.\n\n## Monsoon: June to September\n\nThis is when the clouds happen. The valley below the ridge fills completely, most mornings, and you stand above what looks like an ocean. It is genuinely extraordinary and it is why Sajek is famous.\n\nThe cost is that you see very little else. Long-distance views are gone. The road in is harder. It rains, sometimes for a whole day, and there is not much to do on a ridge in the rain.\n\nGo in monsoon if the cloud sea is the point and you are relaxed about the rest.\n\n## Winter: November to February\n\nClear air, long views, and you can see the ridgelines of three districts on a good morning. Comfortable during the day, genuinely cold at night — bring a jacket, people always underestimate this.\n\nClouds still happen, but less reliably and usually thinner. You might get two good mornings out of three, or you might get none.\n\nGo in winter if you want to see the landscape, and treat the clouds as a bonus.\n\n## The shoulder: October\n\nOctober is the underrated month. The monsoon is ending but the moisture is still there, so you get cloud mornings and clear afternoons in the same trip. The roads have dried out. The crowds have not arrived yet.\n\nIf your dates are flexible, October is the answer.\n\n## What does not change\n\nThe convoy times. Access is by army escort at fixed hours year-round, and missing the convoy means waiting for the next one.\n\nThe accommodation crunch. Sajek has limited rooms and they sell out on every weekend and every holiday, in every season.\n\nThe generator schedule. Power is not continuous at any time of year.\n\n## Our honest recommendation\n\nIf you have never been: go in October or November. You get enough of both, the weather is manageable, and you will know which version you want next time.",
    },
    {
      slug: 'eating-well-on-the-road-in-bangladesh',
      title: 'Eating Well on the Road in Bangladesh',
      media: 'guide-food',
      readMinutes: 6,
      tags: 'food,travel-tips,health',
      excerpt:
        'How to eat brilliantly while travelling here without spending two days of your trip regretting it.',
      body:
        "The food is one of the best reasons to travel in Bangladesh, and stomach trouble is the fastest way to lose two days of a five-day trip. These are not in tension — you just need a few rules.\n\n## Busy is safe\n\nThe single most useful heuristic anywhere in South Asia: eat where there is a queue of locals. High turnover means the food has not been sitting out, and a place that poisons its regulars does not stay busy.\n\nAn empty restaurant with a laminated English menu is a worse bet than a crowded stall with no menu at all.\n\n## Hot, fresh, and cooked in front of you\n\nAnything served steaming from a pan you can see is low risk. Anything at ambient temperature that has been sitting in a display case is higher risk.\n\nThis is why the street food is often safer than the buffet.\n\n## Water is the actual risk\n\nMore trips are ruined by water and ice than by food. Drink sealed bottled water and check that the seal is intact. Skip ice in places where you would not drink the tap water.\n\nOn the boat trips and in the hills we supply purified water — use it rather than buying from village shops where storage is unpredictable.\n\n## What to actually eat\n\nIn the Hill Tracts, look for bamboo-cooked chicken — chicken and spices packed into green bamboo and cooked over fire. It is a Marma and Bawm speciality and it is superb.\n\nIn Srimangal, the seven-layer tea is a tourist thing but worth doing once. The Manipuri food is the real reason to eat there.\n\nOn the coast, order whatever came off the boat that morning and let them cook it their way. Rupchanda and coral are usually the pick.\n\nEverywhere: shorshe ilish if it is hilsa season, and bhorta with almost anything.\n\n## If it goes wrong anyway\n\nOral rehydration salts, from any pharmacy, cheap, and they work. Carry a few sachets.\n\nStop eating solid food for a few hours, keep drinking, and it usually passes within a day. If it does not, or if there is fever or blood, tell your guide immediately — every itinerary we run has a plan for getting you to a doctor.\n\n## Tell us in advance\n\nDietary requirements are much easier to handle when we know before we book the homestays. Vegetarian is straightforward. Vegan, gluten-free and severe allergies need advance notice, particularly in village accommodation where the family cooks one meal for everyone.",
    },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        body: post.body,
        coverMediaId: media.get(post.media) ?? null,
        tags: post.tags,
        readMinutes: post.readMinutes,
        publishedAt: new Date(),
        status: ContentStatus.PUBLISHED,
        seoTitle: post.title,
        seoDescription: post.excerpt,
      },
      update: { body: post.body, excerpt: post.excerpt, status: ContentStatus.PUBLISHED },
    });
  }

  const legalPages = [
    {
      slug: 'terms',
      title: 'Terms & Conditions',
      body: "## Who we are\n\nWild Peak Souls is a travel agency registered in Bangladesh. These terms govern your use of this website and any booking you make through it.\n\n## Bookings\n\nA booking is created when you complete the booking form and is confirmed only when payment has been verified by our team. Creating a booking holds inventory temporarily; it does not guarantee your place until payment is confirmed.\n\nPrices are snapshotted at the moment you book. If our catalogue price changes afterwards, your booking is unaffected in either direction.\n\nWe reserve the right to decline or cancel a booking where information given is materially inaccurate, where payment cannot be verified, or where we reasonably believe the trip is unsuitable for the traveller on safety grounds.\n\n## Payment\n\nPayments made through bKash or Nagad are verified manually by our team against our merchant account. Submitting a transaction ID is a claim of payment, not proof of it — your booking is confirmed only after verification.\n\nWe will never ask you to send money to a number other than the one displayed at checkout in your account. If anyone contacts you asking for payment to a different number, it is not us.\n\n## Your responsibilities\n\nYou are responsible for holding valid travel documents, for meeting any visa requirements, for declaring medical conditions that affect your ability to participate safely, and for arriving at the stated meeting point on time.\n\n## Our responsibilities\n\nWe will deliver the itinerary as described, or the nearest equivalent where circumstances beyond our control prevent it. We will tell you honestly and promptly when something changes.\n\n## Changes beyond our control\n\nWeather, road closures, army permissions in the Hill Tracts, ferry regulations and government directives can all force itinerary changes at short notice. Where this happens we substitute an equivalent experience. Where a trip becomes impossible we refund according to the refund policy.\n\n## Liability\n\nWe are not liable for loss, injury or delay arising from circumstances beyond our reasonable control, or from a traveller's failure to follow the safety instructions of our guides. Adventure travel carries inherent risk which you accept by booking.\n\n## Governing law\n\nThese terms are governed by the laws of Bangladesh.\n\n## Changes to these terms\n\nWe may update these terms. The version in force is the one published on this page at the time of your booking.",
    },
    {
      slug: 'privacy',
      title: 'Privacy Policy',
      body: "## What we collect\n\nWhen you create an account we collect your name, email address and phone number. When you book we additionally collect the contact details you provide for that booking and any notes you choose to share.\n\nWhen you request visa assistance we collect the documents and personal details required for that specific application.\n\nWe record technical information — IP address and browser user agent — against security-sensitive actions such as sign-in and payment verification. This is for fraud prevention and audit.\n\n## What we do not collect\n\nWe do not store your card details. We do not have access to your bKash or Nagad account.\n\n## How we use it\n\nTo deliver the service you asked for: managing your bookings, verifying payments, processing visa applications, and contacting you about a trip you have booked.\n\nTo meet legal and accounting obligations.\n\nTo improve the service, using aggregated data that does not identify you.\n\nWe do not sell your data. We do not share it with third parties except where necessary to deliver your trip — the hotel that needs your name, the embassy that needs your file — or where required by law.\n\n## Who can see it inside our team\n\nAccess is restricted by role. A content editor cannot see your payment records. A finance manager cannot see your password or authentication data. Access to customer records is logged.\n\n## Our AI assistant\n\nWhere we operate an AI assistant on this site, it answers only from published public information — trips, destinations, policies and contact details. It has no access to customer records, bookings, payments, messages or any private data.\n\n## How long we keep it\n\nBooking and financial records are retained as required by Bangladeshi accounting and tax law. Marketing preferences are retained until you withdraw them. Visa documents are retained only as long as needed to complete your application, then deleted.\n\n## Your rights\n\nYou can access, correct or request deletion of your personal data by contacting us. Some records — completed financial transactions — must be retained for legal reasons even after an account is closed.\n\n## Cookies\n\nWe use a session cookie to keep you signed in. It is HTTP-only and cannot be read by JavaScript. We store your theme preference in your browser's local storage; it never reaches our servers.\n\n## Contact\n\nFor any privacy question or request, contact us using the details on our contact page.",
    },
    {
      slug: 'refund',
      title: 'Refund Policy',
      body: "## General principle\n\nWe refund what we have not already committed on your behalf. Permits, homestay deposits, vessel charters and resort blocks are paid in advance and are frequently non-refundable to us — which is why refund windows tighten as departure approaches.\n\n## Standard schedule\n\nUnless the specific trip states otherwise:\n\n- More than 14 days before departure: full refund\n- 14 to 7 days before departure: 50% refund\n- Less than 7 days before departure: no refund\n\nMulti-day expeditions, liveaboards and Saint Martin's trips carry longer windows. The applicable terms are shown on the trip page and in your booking confirmation.\n\n## When we cancel\n\nIf we cancel a departure for any reason — insufficient numbers, weather, a route closure, an operational problem on our side — you receive a full refund, or a transfer to another date, at your choice. Not ours.\n\n## Weather\n\nBoat-based trips cancelled for storm warnings are refunded in full at any notice period. We will not sail in unsafe conditions and you will never be penalised for that decision.\n\n## Payment verification failures\n\nIf your payment cannot be verified and the booking lapses, nothing has been charged and there is nothing to refund. The seats are released back into availability.\n\n## How refunds are paid\n\nRefunds are returned to the same method you paid from, usually within 7 to 10 working days of approval. bKash and Nagad refunds are processed manually and can take slightly longer.\n\n## Partial services\n\nWe do not refund unused portions of a trip — a missed excursion, an early departure, or a service you chose not to take.\n\n## Disputes\n\nIf you disagree with a refund decision, open a support token from your account. It is tracked, assigned to a named person, and you will get a reasoned reply.",
    },
    {
      slug: 'cancellation',
      title: 'Cancellation Policy',
      body: "## Cancelling your own booking\n\nYou can cancel from your account at any time while a booking is pending, awaiting payment, or confirmed. Go to My Bookings, open the booking, and use the cancellation form.\n\nCancelling immediately releases your seats or room-nights back into availability, so somebody else can take them.\n\nRefund eligibility follows the refund policy and depends on how close to departure you cancel.\n\n## After a trip has started\n\nOnce a trip is in progress it can no longer be cancelled from your account. Contact your trip coordinator directly.\n\n## When we cancel\n\nWe will tell you as early as we reasonably can, explain why, and offer either a full refund or a transfer to another date.\n\nThe most common reasons are insufficient numbers on a departure with a stated minimum, unsafe weather, and route closures in restricted areas.\n\n## Minimum numbers\n\nSome trips state a minimum group size. If we do not reach it we will tell you at least 7 days before departure and offer a refund or a transfer.\n\n## Changing rather than cancelling\n\nIf your dates have changed, ask before you cancel. A transfer to another departure is often possible and is usually better for you than a partial refund. Open a support token and we will look at what is available.\n\n## No-shows\n\nFailing to arrive at the stated meeting point without notice is treated as a cancellation inside the no-refund window.",
    },
    {
      slug: 'booking',
      title: 'Booking Policy',
      body: "## How a booking works\n\nSelecting a trip and completing the booking form creates a booking with the status Payment Pending. This holds your seats or room-nights.\n\nThe hold is not indefinite. Bookings that remain unpaid may expire and release their inventory.\n\n## Prices\n\nEvery price is calculated on our server from the current catalogue and then snapshotted onto your booking. Prices shown in your browser are informative; the server's figure is the one that applies, and it is what you will be asked to pay.\n\nIf our catalogue price rises or falls after you book, your booking is unaffected.\n\n## Availability\n\nSeat counts and room availability shown on the site are live, but they are informative. Availability is re-checked on our server inside a database transaction at the moment you book. If two people book the last two seats simultaneously, one succeeds and one is told honestly that the seats have gone.\n\nWe would rather tell you that than take your money for a seat that does not exist.\n\n## Payment\n\nAfter creating a booking you are taken to checkout, where the enabled payment methods and their instructions are shown.\n\nFor bKash and Nagad you send the money and submit the transaction ID. A member of our team then matches that transaction against our merchant account and confirms it. This normally happens within one business day.\n\nYour booking becomes Confirmed only after that verification. You will be notified either way.\n\n## Who can book\n\nYou need an account to book. This is so you have a record of your bookings, invoices and payments, and so we can reach you about your trip.\n\n## Group and corporate bookings\n\nFor groups above the standard maximum, or where you need proper invoicing and documentation for a finance team, contact us directly rather than booking online.\n\n## Accuracy\n\nBook using the name as it appears on the ID you will travel with, particularly for trips involving permits or restricted areas where names are checked against documents.",
    },
    {
      slug: 'visa',
      title: 'Visa Policy',
      body: "## What we do\n\nWe provide visa assistance: document checklists, soft-copy review, file preparation, appointment booking and submission support.\n\n## What we do not do\n\nWe do not issue visas. No agency does. Visas are issued by embassies, high commissions and immigration authorities, entirely at their discretion.\n\nWe cannot guarantee approval, and we will never tell you that we can. If somebody promises you a guaranteed visa, they are either lying or planning to submit fraudulent documents in your name.\n\n## Our service fee\n\nOur fee covers our work — reviewing your documents against the current checklist, preparing the file correctly, booking the appointment and submitting. It is payable regardless of the outcome, because the work is done regardless of the outcome.\n\nEmbassy and government fees are separate, paid to the authority, and are non-refundable if your application is refused.\n\n## Accuracy of information\n\nVisa requirements change without notice. The checklists on this site reflect our latest verified information, and we update them as we learn of changes. Always treat the issuing authority's own guidance as final.\n\n## Your documents\n\nYou are responsible for the accuracy and authenticity of everything you give us. We will not submit a document we believe to be false, and we will end our engagement if asked to.\n\nWe retain your documents only for as long as needed to complete the application, then delete them.\n\n## Your passport\n\nWe never ask for your passport before your file is complete and reviewed. When we do hold it, we return it in person or by tracked courier, and you will always know where it is.\n\n## If your application is refused\n\nWe will tell you the reason given, and advise you honestly on whether reapplying makes sense. Sometimes it does. Sometimes we will tell you it does not, even though a reapplication would mean another fee for us.\n\n## Timelines\n\nProcessing times on our visa pages are realistic estimates based on recent experience, not best cases. Apply early. Peak seasons are genuinely slower and no amount of paying extra changes that for most categories.",
    },
  ];

  for (const page of legalPages) {
    await prisma.legalPage.upsert({
      where: { slug: page.slug },
      create: { ...page, status: ContentStatus.PUBLISHED },
      update: { body: page.body, title: page.title, status: ContentStatus.PUBLISHED },
    });
  }

  const faqs = [
    { category: 'BOOKING', question: 'How do I know my booking is actually confirmed?', answer: 'Your booking shows as Confirmed in your account only after a member of our team has verified your payment against our merchant account. You will get a notification when that happens. Until then it shows as Payment Pending, and your seats are held but not guaranteed.' },
    { category: 'BOOKING', question: 'Can I book for someone else?', answer: 'Yes. Enter their details as the lead traveller contact when booking. Bear in mind that for trips involving permits or restricted areas, the name must match the ID they will actually travel with.' },
    { category: 'BOOKING', question: 'What happens if a trip does not reach its minimum group size?', answer: 'We will tell you at least 7 days before departure and offer you a full refund or a transfer to another date. The choice is yours, not ours.' },
    { category: 'BOOKING', question: 'The site says seats are available but my booking failed. Why?', answer: 'Seat counts on the page are live but informative. Availability is re-checked on our server at the moment you book, inside a database transaction. If someone completed a booking a moment before you, the seats genuinely went. We would rather tell you honestly than take payment for a seat that no longer exists.' },
    { category: 'PAYMENT', question: 'Which payment methods can I use?', answer: 'bKash and Nagad are currently enabled. Card payments through SSLCommerz are supported by the platform and will be switched on once merchant onboarding is complete. The methods available to you are shown at checkout.' },
    { category: 'PAYMENT', question: 'How long does payment verification take?', answer: 'Normally within one business day. Payments submitted late at night or over a weekend are verified the next working morning. You get a notification either way.' },
    { category: 'PAYMENT', question: 'I entered the wrong transaction ID. What now?', answer: 'Open a support token from your account with the correct ID, or contact us directly. We can correct it — it is a common mistake and it does not put your booking at risk.' },
    { category: 'PAYMENT', question: 'Someone messaged me asking to send payment to a different number. Is that you?', answer: 'No. We will only ever ask for payment to the number shown at checkout inside your own account. If anyone contacts you by phone, WhatsApp or social media asking you to send money elsewhere, it is a scam. Report it to us.' },
    { category: 'GENERAL', question: 'Do I need to be fit for your trips?', answer: 'It depends entirely on the trip. Every trip page states a difficulty level and the daily walking involved. Our Srimangal and Sajek trips involve almost no hard walking. The Keokradong expedition involves six to eight hours a day on steep ground. If you are unsure, ask us before booking — we will tell you honestly.' },
    { category: 'GENERAL', question: 'Are solo travellers welcome?', answer: 'Yes, on every group departure. You will be placed in shared accommodation with someone of the same gender unless you pay the single-occupancy supplement. A good proportion of our travellers come alone.' },
    { category: 'GENERAL', question: 'Can you accommodate dietary requirements?', answer: 'Vegetarian is straightforward everywhere. Vegan, gluten-free and severe allergies need advance notice, particularly for village homestays where one meal is cooked for the whole group. Tell us when you book, not on the day.' },
    { category: 'VISA', question: 'Can you guarantee my visa will be approved?', answer: 'No, and neither can anyone else. Visas are issued at the discretion of the embassy or high commission. What we can do is make sure your file is complete and correct, which is what most refusals actually turn on.' },
    { category: 'VISA', question: 'Do I have to give you my passport?', answer: 'Only when your file is complete and reviewed, and only for the applications that require physical submission. We never ask for it earlier, we return it in person or by tracked courier, and you will always know where it is.' },
    { category: 'VISA', question: 'Is your service fee refunded if the visa is refused?', answer: 'No. The fee covers our work — reviewing, preparing and submitting your file — and that work is done regardless of the outcome. Embassy fees are separate and are also non-refundable on refusal.' },
    { category: 'TECHNICAL', question: 'Can I use the site in dark mode?', answer: 'Yes. The theme toggle is in the header on every page. It follows your system setting by default and remembers your choice in your browser.' },
    { category: 'CANCELLATION', question: 'Can I cancel my booking, and will I get my money back?', answer: 'Yes, you can cancel from your account or by contacting us. What you get back depends on how close to departure you cancel — the free cancellation window is set per trip and shown on the booking page before you pay. Cancel inside that window and you are refunded in full; after it, the refund reduces as departure approaches because we have already committed to transport and accommodation. The full terms are on our cancellation policy page.' },
    { category: 'CANCELLATION', question: 'How long does a refund take to reach me?', answer: 'Once approved, refunds are sent back to the number or account the payment came from, normally within three to five working days. bKash and Nagad are usually same-day once processed. We notify you when it is sent — if it has not arrived after a week, tell us and we will trace it.' },
    { category: 'CANCELLATION', question: 'What if you cancel the trip?', answer: 'You get every taka back, including any service fee, and you are told as early as we know. That is the one case where a full refund is automatic no matter how close to departure it happens. Where we can, we offer a transfer to another date instead, but the choice is yours.' },
    { category: 'CANCELLATION', question: 'Can I move my booking to a different date instead of cancelling?', answer: 'Usually yes, and it is often better for both of us than a cancellation. Ask us before your free cancellation window closes and we will move you to another departure of the same trip at no charge, subject to seats. After that window a date change is treated like a cancellation and rebooking.' },
    { category: 'TECHNICAL', question: 'Do you sell flight or train tickets?', answer: 'No. The flight explorer shows indicative routes and timings so you can plan, and sends us a booking request that we quote against the live airline fare. The train schedule is purely informational — we do not sell rail tickets at all.' },
  ];

  for (const [index, faq] of faqs.entries()) {
    const id = `seed-faq-${index}`;
    await prisma.faqItem.upsert({
      where: { id },
      create: { id, ...faq, sortOrder: index, status: ContentStatus.PUBLISHED },
      update: { question: faq.question, answer: faq.answer, sortOrder: index },
    });
  }

  await prisma.homeSection.upsert({
    where: { key: 'hero' },
    create: {
      key: 'hero',
      title: 'Journeys crafted for wandering souls',
      subtitle: 'Curated journeys across Bangladesh and beyond',
      body: 'Wild Peak Souls plans, operates and supports the whole trip — group departures, private tours, stays, visas and transport — so you only have to show up.',
      sortOrder: 0,
      enabled: true,
    },
    update: {},
  });

  console.log(
    `  ${services.length} services, ${posts.length} guides, ${legalPages.length} policy pages, ${faqs.length} FAQ items`,
  );
}

async function seedMarketing(media: Map<string, string>) {
  console.log('→ marketing');

  await prisma.notice.upsert({
    where: { id: 'seed-notice-winter' },
    create: {
      id: 'seed-notice-winter',
      title: 'Winter departures are open',
      message: 'Bandarban and Sajek dates through February are published. Group sizes are capped.',
      type: NoticeType.INFO,
      ctaText: 'See departures',
      ctaUrl: '/events',
      priority: 10,
      active: true,
    },
    update: { active: true },
  });

  await prisma.advertisement.upsert({
    where: { id: 'seed-ad-custom' },
    create: {
      id: 'seed-ad-custom',
      title: 'Planning something for a group of 20 or more?',
      description:
        'Corporate offsites, university trips and family reunions — we handle permits, transport, stays and a coordinator on the ground.',
      ctaText: 'Get a group quote',
      ctaUrl: '/custom-tour',
      placement: AdPlacement.HOME_BILLBOARD,
      priority: 5,
      active: true,
    },
    update: { active: true },
  });

  // Two hero slides, so a fresh install shows the dashboard-controlled banner
  // actually working rather than only its fallback wording.
  await prisma.heroSlide.upsert({
    where: { id: 'seed-hero-hilltracts' },
    create: {
      id: 'seed-hero-hilltracts',
      title: 'Journeys crafted for wandering souls',
      subtitle: 'Winter departures are open',
      body: 'Group trips, private tours, stays and visas across Bangladesh and beyond — planned and run by the same people who guide them.',
      mediaId: media.get('bandarban') ?? null,
      overlayOpacity: 45,
      textAlign: 'center',
      primaryCtaText: 'See departures',
      primaryCtaUrl: '/events',
      secondaryCtaText: 'Plan a custom trip',
      secondaryCtaUrl: '/custom-tour',
      showSearch: true,
      sortOrder: 0,
      active: true,
    },
    update: { active: true },
  });

  await prisma.heroSlide.upsert({
    where: { id: 'seed-hero-sajek' },
    create: {
      id: 'seed-hero-sajek',
      title: 'Wake up above the clouds in Sajek',
      subtitle: 'Small groups, real guides',
      body: 'Capped group sizes, permits handled, and a coordinator with you on the ground for the whole trip.',
      mediaId: media.get('sajek') ?? null,
      overlayOpacity: 50,
      textAlign: 'left',
      primaryCtaText: 'Browse Sajek trips',
      primaryCtaUrl: '/destinations/sajek',
      showSearch: false,
      sortOrder: 1,
      active: true,
    },
    update: { active: true },
  });

  console.log('  1 notice, 1 advertisement, 2 hero slides');
}

async function main() {
  console.log('\nWild Peak Souls — seeding database\n');

  await seedPermissions();
  await seedRoles();
  await seedUsers();
  await seedSettings();

  const media = await seedMedia();
  const destinations = await seedDestinations(media);
  const activities = await seedActivities(destinations, media);
  await seedEvents(destinations, media, activities);
  await seedTours(destinations, media);
  await seedStays(destinations, media);
  await seedVisa();
  await seedTransport();
  await seedContent(media);
  await seedMarketing(media);

  console.log('\nSeed complete.\n');
  console.log('Sign in at /login with:');
  console.log(`  email:    ${process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@wildpeaksouls.com'}`);
  console.log(`  password: ${process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe#2026'}`);
  console.log('\nChange this password immediately in any shared environment.\n');
}

main()
  .catch((error) => {
    console.error('\nSeed failed:\n', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
