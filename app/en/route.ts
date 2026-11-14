/* GET /en — switch the store to English, then go to `?next=` (or home). */

import { createLocaleSwitchHandler } from "@/lib/i18n/locale-route";

export const GET = createLocaleSwitchHandler("en");
