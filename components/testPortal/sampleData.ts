/**
 * Demonstration content for the test portal (Handover 63 Part 3). Every
 * answer is a real option of the real step; the contact details use the
 * reserved `.test` domain, which can never receive mail.
 */

export const SAMPLE_CONTACT = {
  fullName: "Demo Client",
  email: "demo@glamrepairs.test",
  phone: "+92 300 0000000",
};

export const SAMPLE_ANSWERS: Record<string, unknown> = {
  "onboarding.firstName": SAMPLE_CONTACT.fullName,
  "onboarding.email": SAMPLE_CONTACT.email,
  "onboarding.phone": SAMPLE_CONTACT.phone,
  "booking.skinType": "combination",
  "booking.improveArea": ["forehead", "cheeks"],
  "booking.skinTone": "medium",
  "onboarding.primaryConcern": ["acne-breakouts"],
  "onboarding.concernDuration": "1-6-months",
  "booking.dailyRoutine": "morning-only",
  "booking.skincareProducts": ["cleanser", "spf"],
  "booking.location": "Lahore, Pakistan",
  "booking.locationLat": 31.5204,
  "booking.locationLon": 74.3587,
  "onboarding.city": "Lahore",
  "onboarding.age": "27",
  "onboarding.gender": "female",
  "onboarding.sleep": "5-6",
  "onboarding.water": "4-6",
  "onboarding.stress": "moderate",
  "onboarding.diet": ["tea-coffee"],
  "booking.improveGoals": ["skincare-consistency"],
  "booking.journeyFeel": ["confident-in-skin"],
  "booking.specialEvent": "none",
  "booking.eventDate": "",
};

/** Six different close-ups of skin texture, generated, not photographs of anyone. */
export const SAMPLE_PHOTOS = [1, 2, 3, 4, 5, 6].map((n) => `/test-portal/sample-skin-${n}.jpg`);

/** The step the sample answers jump to: the photo step. */
export const SAMPLE_JUMP_STEP = 24;
