/* GET /ar — switch the store to Arabic, then go to `?next=` (or home). */

import { createLocaleSwitchHandler } from "@/lib/i18n/locale-route";

export const GET = createLocaleSwitchHandler("ar");
