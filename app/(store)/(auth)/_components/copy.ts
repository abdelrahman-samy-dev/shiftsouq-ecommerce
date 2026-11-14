/* Sign-in pages copy — English and Modern Standard Arabic. */

const en = {
  /* Editorial panel */
  panelEyebrow: "Members",
  panelTitle: "Your orders, addresses and details in one place.",
  benefits: ["Follow every order from confirmation to your door", "Check out faster with saved addresses", "Cash on delivery across Egypt"],

  /* Sign in */
  signInTitle: "Sign in",
  signInIntro: "Welcome back. Sign in to see your orders and check out faster.",
  email: "Email",
  password: "Password",
  forgot: "Forgot your password?",
  signIn: "Sign in",
  newHere: "New here?",
  createAccount: "Create an account",
  linkExpired: "That link has expired or was already used. Sign in, or ask for a new link.",
  showPassword: "Show password",
  hidePassword: "Hide password",

  /* Register */
  registerTitle: "Create an account",
  registerIntro: "Save your details for faster checkout and follow every order.",
  firstName: "First name",
  lastName: "Last name",
  passwordHint: "At least 8 characters.",
  create: "Create account",
  agree: "By creating an account you agree to our",
  terms: "Terms",
  /** Joins "Terms" and "Privacy policy" (spaces included; Arabic "و" attaches to the next word). */
  and: " and ",
  privacy: "Privacy policy",
  haveAccount: "Already have an account?",
  checkInbox: "Check your inbox",
  checkInboxBody: (email: string) => `We sent a confirmation link to ${email}. Open it to finish creating your account.`,
  backToSignIn: "Back to sign in",

  /* Forgot */
  forgotTitle: "Reset your password",
  forgotIntro: "Enter the email of your account and we'll send you a link to choose a new password.",
  sendLink: "Send reset link",
  sentTitle: "Check your inbox",
  sentBody: (email: string) => `If an account exists for ${email}, a link to reset your password is on its way. It works for one hour.`,
  sentHint: "Didn't get it? Check your spam folder, or try again in a minute.",
  tryAgain: "Use another email",
  rememberIt: "Remembered it?",

  /* Reset */
  resetTitle: "Choose a new password",
  resetIntro: "Pick a password you don't use anywhere else.",
  newPassword: "New password",
  confirmPassword: "Confirm new password",
  savePassword: "Save and sign in",
  resetExpiredTitle: "This link has expired",
  resetExpiredBody: "Reset links work once, for one hour. Ask for a new one and use it in this browser.",
  requestNew: "Ask for a new link",
} as const;

type Copy = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : (typeof en)[K] extends readonly string[]
      ? readonly string[]
      : string;
};

const ar: Copy = {
  panelEyebrow: "الأعضاء",
  panelTitle: "طلباتك وعناوينك وبياناتك في مكان واحد.",
  benefits: ["تابع كل طلب من التأكيد حتى باب منزلك", "أتمّ طلبك بسرعة أكبر بالعناوين المحفوظة", "الدفع عند الاستلام في كل محافظات مصر"],

  signInTitle: "تسجيل الدخول",
  signInIntro: "أهلًا بعودتك. سجّل الدخول لعرض طلباتك وإتمام الطلب بسرعة أكبر.",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  forgot: "نسيت كلمة المرور؟",
  signIn: "تسجيل الدخول",
  newHere: "جديد هنا؟",
  createAccount: "أنشئ حسابًا",
  linkExpired: "انتهت صلاحية هذا الرابط أو استُخدم من قبل. سجّل الدخول، أو اطلب رابطًا جديدًا.",
  showPassword: "إظهار كلمة المرور",
  hidePassword: "إخفاء كلمة المرور",

  registerTitle: "إنشاء حساب",
  registerIntro: "احفظ بياناتك لإتمام الطلب بسرعة أكبر وتابع كل طلباتك.",
  firstName: "الاسم الأول",
  lastName: "اسم العائلة",
  passwordHint: "8 أحرف على الأقل.",
  create: "إنشاء الحساب",
  agree: "بإنشاء حساب فإنك توافق على",
  terms: "الشروط",
  and: " و",
  privacy: "سياسة الخصوصية",
  haveAccount: "لديك حساب بالفعل؟",
  checkInbox: "تحقّق من بريدك الوارد",
  checkInboxBody: (email) => `أرسلنا رابط تأكيد إلى ${email}. افتحه لإكمال إنشاء حسابك.`,
  backToSignIn: "العودة إلى تسجيل الدخول",

  forgotTitle: "إعادة تعيين كلمة المرور",
  forgotIntro: "أدخل بريد حسابك الإلكتروني وسنرسل إليك رابطًا لاختيار كلمة مرور جديدة.",
  sendLink: "إرسال رابط إعادة التعيين",
  sentTitle: "تحقّق من بريدك الوارد",
  sentBody: (email) => `إذا كان هناك حساب مسجّل بالبريد ${email} فسيصله رابط لإعادة تعيين كلمة المرور، ويعمل الرابط لمدة ساعة.`,
  sentHint: "لم يصلك؟ تحقّق من مجلد الرسائل غير المرغوب فيها، أو أعد المحاولة بعد دقيقة.",
  tryAgain: "استخدام بريد آخر",
  rememberIt: "تذكّرتها؟",

  resetTitle: "اختر كلمة مرور جديدة",
  resetIntro: "اختر كلمة مرور لا تستخدمها في أي مكان آخر.",
  newPassword: "كلمة المرور الجديدة",
  confirmPassword: "تأكيد كلمة المرور الجديدة",
  savePassword: "حفظ وتسجيل الدخول",
  resetExpiredTitle: "انتهت صلاحية هذا الرابط",
  resetExpiredBody: "يعمل رابط إعادة التعيين مرة واحدة ولمدة ساعة. اطلب رابطًا جديدًا واستخدمه في هذا المتصفح.",
  requestNew: "طلب رابط جديد",
};

export function authCopy(locale: string): Copy {
  return locale === "ar" ? ar : (en as unknown as Copy);
}
