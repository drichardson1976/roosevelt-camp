// Default data — shared across all 4 apps

export const DEFAULT_CONTENT = {
  heroTitle: "Roosevelt Girls Basketball",
  heroSubtitle: "Summer Daycamp 2026",
  heroTagline: "Build Skills. Build Friendships. Build Your Future.",
  heroImage: null,
  venmoImage: null,
  venmoUsername: "@RHSDayCamp",
  aboutText: "Join us for an incredible summer of basketball at Roosevelt High School! Our camp is designed for young athletes who want to develop their basketball skills while having fun and making lasting friendships.",
  contactEmail: "rhsdaycamp@gmail.com",
  contactPhone: "(206) 384-1872",
  sessionMorning: "9:00 AM - 12:00 PM",
  sessionAfternoon: "12:00 PM - 3:00 PM",
  sessionCost: "$60",
  campDates: "Weekdays from July 13-17 & August 10-28, 2026",
  ageRange: "Completed 3rd - 8th Grade",
  locationName: "Roosevelt High School",
  locationAddress: "1410 NE 66th St",
  locationCity: "Seattle",
  locationState: "WA",
  locationZip: "98115",
  locationDetails: "Roosevelt High School Gymnasium - Enter through the main gym entrance on the east side of the building.",
  singleSessionCost: 60,
  weekDiscount: 10,
  multiWeekDiscount: 15,
  cancellationPolicy: "All cancellation requests must be submitted at least 14 days (2 weeks) before the scheduled session to receive a full refund. Cancellations made less than 14 days in advance are non-refundable but may be credited toward a future session at the camp director's discretion. No-shows are non-refundable.",
  latePickupPolicy: "Camp sessions end promptly at the scheduled time. Our counselors volunteer their time and have other commitments after camp. If you anticipate being late, please call us immediately. As a gesture of appreciation for counselors who stay late due to delayed pickups, we kindly suggest purchasing a small Starbucks gift card ($5-10) for the counselor who waited with your child. Repeated late pickups may result in dismissal from the camp.",
  scholarshipInfo: "We believe every child deserves the chance to experience our camp. Apply for scholarship assistance through your Parent Dashboard.",
  pickupPolicyFacePhoto: null,
  pickupPolicyIdPhoto: null
};

export const DEFAULT_COUNSELORS = [
  { id: 'c1', name: 'Sarah Mitchell', email: 'sarah.mitchell@roosevelt.edu', phone: '(206) 555-0101', position: 'Point Guard', year: 'Senior', bio: 'Team captain with 3 years varsity experience.', photo: null, visible: true, order: 0 },
  { id: 'c2', name: 'Maya Johnson', email: 'maya.johnson@roosevelt.edu', phone: '(206) 555-0102', position: 'Shooting Guard', year: 'Senior', bio: 'Sharpshooter with excellent 3-point range.', photo: null, visible: true, order: 1 },
  { id: 'c3', name: 'Emma Chen', email: 'emma.chen@roosevelt.edu', phone: '(206) 555-0103', position: 'Small Forward', year: 'Junior', bio: 'Versatile player known for lockdown defense.', photo: null, visible: true, order: 2 },
  { id: 'c4', name: 'Jasmine Williams', email: 'jasmine.williams@roosevelt.edu', phone: '(206) 555-0104', position: 'Center', year: 'Junior', bio: 'Starting center with strong post moves.', photo: null, visible: true, order: 3 },
];

export const DEFAULT_ADMINS = [
  { id: 'admin_derek', name: 'Derek Richardson', email: 'derek.richardson@gmail.com', loginType: 'google', createdAt: '2026-02-28T00:00:00.000Z' },
  { id: 'admin_camp', name: 'Camp Director (Gmail)', email: 'rhsdaycamp@gmail.com', loginType: 'google', createdAt: '2026-02-28T00:00:00.000Z' }
];
