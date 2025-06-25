// const jsonServer = require("json-server");
// const server = jsonServer.create();
// const router = jsonServer.router("./DB/deepseek_json_20250624_124bdd.json");
// const middlewares = jsonServer.defaults();
// const express = require("express");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const multer = require("multer");
// const { v4: uuidv4 } = require("uuid");
// const crypto = require("crypto");
// const path = require("path");
// const fs = require("fs");

// server.use(middlewares);
// server.use(express.json({ limit: "50mb" }));
// server.use(express.urlencoded({ extended: true, limit: "50mb" }));

// // تنظیمات
// const SECRET_KEY = "your-very-secure-key-123!@#";
// const TOKEN_EXPIRY = "1h";

// // لیست مسیرهای عمومی که نیاز به احراز هویت ندارند
// const PUBLIC_ROUTES = ["/register", "/login", "/courses", "/courses/:courseId"];

// // لیست مسیرهای ادمین
// const ADMIN_ROUTES = ["/users", "/ban", "/offs/all", "/offs/:courseId"];

// // تنظیمات ذخیره‌سازی فایل‌ها
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     let folder = "public/uploads/";
//     if (file.fieldname === "avatar") folder += "avatars/";
//     else if (file.fieldname === "courseImage") folder += "courses/";
//     else if (file.fieldname === "video") folder += "videos/";
//     cb(null, folder);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     cb(null, `${uuidv4()}${ext}`);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 50 * 1024 * 1024 }, // حداکثر 50 مگابایت
//   fileFilter: (req, file, cb) => {
//     const validTypes = ["image/jpeg", "image/png", "video/mp4"];
//     if (validTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error("فرمت فایل نامعتبر است!"), false);
//     }
//   },
// });

// // --- Middleware احراز هویت ---
// server.use((req, res, next) => {
//   // استخراج مسیر بدون پارامترهای کوئری
//   const pathWithoutQuery = req.path.split("?")[0];

//   // اگر مسیر عمومی است، اجازه دسترسی بده
//   if (
//     PUBLIC_ROUTES.some((route) => {
//       if (route.includes(":")) {
//         // برای مسیرهای دارای پارامتر مثل /courses/:courseId
//         const basePath = route.split("/:")[0];
//         return pathWithoutQuery.startsWith(basePath);
//       }
//       return pathWithoutQuery === route;
//     })
//   ) {
//     return next();
//   }

//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) return res.status(401).json({ error: "دسترسی غیرمجاز" });

//   jwt.verify(token, SECRET_KEY, (err, user) => {
//     if (err) return res.status(403).json({ error: "توکن نامعتبر" });

//     // بررسی مسیرهای ادمین
//     if (
//       ADMIN_ROUTES.some((route) => {
//         if (route.includes(":")) {
//           const basePath = route.split("/:")[0];
//           return pathWithoutQuery.startsWith(basePath);
//         }
//         return pathWithoutQuery === route;
//       })
//     ) {
//       const db = router.db;
//       const userData = db.get("users").find({ id: user.userId }).value();

//       if (!userData || userData.role !== "admin") {
//         return res.status(403).json({ error: "دسترسی مخصوص ادمین" });
//       }
//     }

//     req.user = user;
//     next();
//   });
// });

// // --- روت‌های API ---

// /**
//  * @api {post} /register ثبت‌نام کاربر
//  * @apiBody {String} username نام کاربری
//  * @apiBody {String} password رمز عبور
//  * @apiBody {String} email ایمیل
//  * @apiBody {String} phonenumber شماره تلفن
//  * @apiBody {String} fullname نام و نام خانوادگی
//  */
// server.post("/register", async (req, res) => {
//   const { username, password, email, phonenumber, fullname } = req.body;

//   if (!username || !password || !email || !phonenumber || !fullname) {
//     return res.status(400).json({ error: "تمام فیلدها الزامی هستند" });
//   }

//   const db = router.db;
//   const exists = db.get("users").find({ username }).value();

//   if (exists) {
//     return res.status(400).json({ error: "نام کاربری موجود است" });
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);

//   const user = {
//     id: crypto.randomUUID(),
//     username,
//     role: "user",
//     password: hashedPassword,
//     phonenumber,
//     fullname,
//     email,
//     isBanned: false,
//     purchasedCourses: [],
//   };

//   db.get("users").push(user).write();
//   res.status(201).json({ message: "ثبت‌نام موفق" });
// });

// /**
//  * @api {post} /login ورود کاربر
//  * @apiBody {String} username نام کاربری
//  * @apiBody {String} password رمز عبور
//  */
// server.post("/login", async (req, res) => {
//   const { username, password } = req.body;

//   const db = router.db;
//   const user = db.get("users").find({ username }).value();

//   if (!user || !(await bcrypt.compare(password, user.password))) {
//     return res.status(401).json({ error: "نام کاربری یا رمز عبور نادرست" });
//   }

//   if (user.isBanned) {
//     return res.status(403).json({ error: "حساب شما مسدود شده است" });
//   }

//   const token = jwt.sign({ userId: user.id }, SECRET_KEY, {
//     expiresIn: TOKEN_EXPIRY,
//   });
//   res.json({ token, userId: user.id });
// });

// /**
//  * @api {post} /ban بن/رفع بن کاربر
//  * @apiHeader {String} Authorization توکن احراز هویت
//  * @apiBody {String} userId شناسه کاربر
//  * @apiBody {Boolean} isBanned وضعیت بن
//  */
// server.post("/ban", (req, res) => {
//   const { userId, isBanned } = req.body;

//   if (typeof isBanned !== "boolean") {
//     return res
//       .status(400)
//       .json({ error: "مقدار isBanned باید true/false باشد" });
//   }

//   const db = router.db;
//   const user = db.get("users").find({ id: userId }).value();

//   if (!user) {
//     return res.status(404).json({ error: "کاربر یافت نشد" });
//   }

//   db.get("users").find({ id: userId }).assign({ isBanned }).write();

//   res.json({
//     success: true,
//     message: `کاربر ${isBanned ? "بن" : "رفع بن"} شد`,
//   });
// });

// /**
//  * @api {post} /purchase خرید دوره
//  * @apiHeader {String} Authorization توکن احراز هویت
//  * @apiBody {String} userId شناسه کاربر
//  * @apiBody {String[]} courseIds آرایه شناسه دوره‌ها
//  */
// server.post("/purchase", (req, res) => {
//   const { userId, courseIds } = req.body;

//   if (!Array.isArray(courseIds)) {
//     return res.status(400).json({ error: "courseIds باید آرایه باشد" });
//   }

//   const db = router.db;
//   const user = db.get("users").find({ id: userId }).value();

//   if (!user) {
//     return res.status(404).json({ error: "کاربر یافت نشد" });
//   }

//   // اضافه کردن دوره‌های جدید (بدون تکرار)
//   const updatedCourses = [...new Set([...user.purchasedCourses, ...courseIds])];

//   db.get("users")
//     .find({ id: userId })
//     .assign({ purchasedCourses: updatedCourses })
//     .write();

//   res.json({
//     success: true,
//     purchasedCourses: updatedCourses,
//   });
// });

// /**
//  * @api {get} /user-courses دریافت دوره‌های کاربر
//  * @apiHeader {String} Authorization توکن احراز هویت
//  * @apiParam {String} userId شناسه کاربر
//  */
// server.get("/user-courses/:userId", (req, res) => {
//   const { userId } = req.params;

//   const db = router.db;
//   const user = db.get("users").find({ id: userId }).value();

//   if (!user) {
//     return res.status(404).json({ error: "کاربر یافت نشد" });
//   }

//   const courses = db
//     .get("courses")
//     .filter((course) => user.purchasedCourses.includes(course.id))
//     .value();

//   res.json({
//     user: {
//       id: user.id,
//       username: user.username,
//       email: user.email,
//     },
//     courses,
//   });
// });

// /**
//  * @api {post} /offs/all اعمال تخفیف به همه دوره‌ها
//  * @apiHeader {String} Authorization توکن احراز هویت
//  * @apiBody {Number} percentage درصد تخفیف
//  */
// server.post("/offs/all", (req, res) => {
//   const { percentage } = req.body;

//   if (!percentage || percentage < 0 || percentage > 100) {
//     return res.status(400).json({ error: "درصد تخفیف نامعتبر است (0-100)" });
//   }

//   const db = router.db;
//   const courses = db.get("courses").value();

//   courses.forEach((course) => {
//     const originalPrice = course.originalPrice || course.price;
//     const discountedPrice = (originalPrice * (100 - percentage)) / 100;

//     db.get("courses")
//       .find({ id: course.id })
//       .assign({
//         discount: percentage,
//         price: discountedPrice,
//         originalPrice,
//       })
//       .write();
//   });

//   res.json({
//     success: true,
//     message: `تخفیف ${percentage}% به همه دوره‌ها اعمال شد`,
//   });
// });

// /**
//  * @api {post} /offs/:courseId اعمال تخفیف به دوره خاص
//  * @apiHeader {String} Authorization توکن احراز هویت
//  * @apiParam {String} courseId شناسه دوره
//  * @apiBody {Number} percentage درصد تخفیف
//  */
// server.post("/offs/:courseId", (req, res) => {
//   const { percentage } = req.body;
//   const { courseId } = req.params;

//   if (!percentage || percentage < 0 || percentage > 100) {
//     return res.status(400).json({ error: "درصد تخفیف نامعتبر است (0-100)" });
//   }

//   const db = router.db;
//   const course = db.get("courses").find({ id: courseId }).value();

//   if (!course) {
//     return res.status(404).json({ error: "دوره یافت نشد" });
//   }

//   const originalPrice = course.originalPrice || course.price;
//   const discountedPrice = (originalPrice * (100 - percentage)) / 100;

//   db.get("courses")
//     .find({ id: courseId })
//     .assign({
//       discount: percentage,
//       price: discountedPrice,
//       originalPrice,
//     })
//     .write();

//   res.json({
//     success: true,
//     message: `تخفیف ${percentage}% به دوره اعمال شد`,
//     newPrice: discountedPrice,
//   });
// });

// // آپلود عکس دوره
// /**
// * @api {post} /upload-course-image اعمال تخفیف به دوره خاص
// * @apiHeader {String} Authorization توکن احراز هویت
// * @apiBody {String} courseId شناسه دوره
// * @apiBody {String} courseImage عکس دوره
// */
// server.post(
//   "/upload-course-image",
//   upload.single("courseImage"),
//   (req, res) => {
//     if (!req.file)
//       return res.status(400).json({ error: "هیچ فایلی آپلود نشد" });

//     const db = router.db;
//     const courseId = req.body.courseId;
//     const imageUrl = `/uploads/courses/${req.file.filename}`;

//     db.get("courses")
//       .find({ id: courseId })
//       .assign({ image: imageUrl })
//       .write();

//     res.json({ imageUrl });
//   }
// );

// // آپلود ویدئو جلسه
// server.post("/upload-session-video", upload.single("video"), (req, res) => {
//   if (!req.file) return res.status(400).json({ error: "هیچ فایلی آپلود نشد" });

//   const db = router.db;
//   const sessionId = req.body.sessionId;
//   const videoUrl = `/uploads/videos/${req.file.filename}`;

//   db.get("sessions").find({ id: sessionId }).assign({ videoUrl }).write();

//   res.json({ videoUrl });
// });

// server.use("/uploads", express.static("public/uploads"));
// server.use(router);
// server.listen(8080, () => {
//   console.log("سرور API در حال اجرا است: http://localhost:8080");
//   console.log("مستندات API:");
//   console.log(`
//   ================================================
//   | API Endpoint          | Method | Description |
//   ================================================
//   | /register            | POST   | ثبت‌نام کاربر |
//   | /login               | POST   | ورود کاربر   |
//   | /ban                 | POST   | بن کردن کاربر|
//   | /purchase            | POST   | خرید دوره‌ها |
//   | /user-courses/:userId| GET    | دوره‌های کاربر|
//   | /offs/all            | POST   | تخفیف کلی    |
//   | /offs/:courseId      | POST   | تخفیف دوره   |
//   ================================================
//   `);
// });

const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("./DB/deepseek_json_20250624_124bdd.json");
const middlewares = jsonServer.defaults({
  static: "./public/uploads", // اضافه کردن مسیر استاتیک برای آپلودها
  bodyParser: true, // اجازه می‌دهد json-server خودش bodyParser را مدیریت کند
});
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { log } = require("console");

// تنظیمات
const SECRET_KEY = "your-very-secure-key-123!@#";
const TOKEN_EXPIRY = "1h";

// لیست مسیرهای عمومی که نیاز به احراز هویت ندارند
const PUBLIC_ROUTES = ["/register", "/login", "/courses", "/courses/:courseId"];

// لیست مسیرهای ادمین
const ADMIN_ROUTES = ["/users", "/ban", "/offs/all", "/offs/:courseId"];

// تنظیمات multer برای آپلود فایل
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "public/uploads/";
    if (file.fieldname === "avatar") folder += "avatars/";
    else if (file.fieldname === "courseImage") folder += "courses/";
    else if (file.fieldname === "video") folder += "videos/";

    // ایجاد پوشه اگر وجود نداشته باشد
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // حداکثر 50 مگابایت
  fileFilter: (req, file, cb) => {
    const validTypes = ["image/jpeg", "image/png", "video/mp4"];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("فرمت فایل نامعتبر است!"), false);
    }
  },
});

// استفاده از میدلورهای json-server
server.use(middlewares);

// اضافه کردن middleware برای افزایش limit حجم درخواست‌ها
server.use(express.json({ limit: "50mb" }));
server.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- Middleware احراز هویت ---
server.use((req, res, next) => {
  // استخراج مسیر بدون پارامترهای کوئری
  const pathWithoutQuery = req.path.split("?")[0];

  // اگر مسیر عمومی است، اجازه دسترسی بده
  if (
    PUBLIC_ROUTES.some((route) => {
      if (route.includes(":")) {
        const basePath = route.split("/:")[0];
        return pathWithoutQuery.startsWith(basePath);
      }
      return pathWithoutQuery === route;
    })
  ) {
    return next();
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "دسترسی غیرمجاز" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "توکن نامعتبر" });

    // بررسی مسیرهای ادمین
    if (
      ADMIN_ROUTES.some((route) => {
        if (route.includes(":")) {
          const basePath = route.split("/:")[0];
          return pathWithoutQuery.startsWith(basePath);
        }
        return pathWithoutQuery === route;
      })
    ) {
      const db = router.db;
      const userData = db.get("users").find({ id: user.userId }).value();

      if (!userData || userData.role !== "admin") {
        return res.status(403).json({ error: "دسترسی مخصوص ادمین" });
      }
    }

    req.user = user;
    next();
  });
});

// --- روت‌های API ---

/**
 * @api {post} /register ثبت‌نام کاربران و معلمین
 * @apiBody {String} username نام کاربری
 * @apiBody {String} password رمز عبور
 * @apiBody {String} email ایمیل
 * @apiBody {String} fullname نام کامل
 * @apiBody {String} role نقش (user یا teacher)
 */
server.post('/register', async (req, res) => {
  const { username, password, email, fullname , phonenumber, role = 'user' } = req.body;

  // اعتبارسنجی ورودی‌ها
  if (!username || !password || !email || !fullname || !phonenumber) {
    return res.status(400).json({ error: 'تمام فیلدها الزامی هستند' });
  }

  if (role !== 'user' && role !== 'teacher') {
    return res.status(400).json({ error: 'نقش نامعتبر (فقط user یا teacher)' });
  }

  const db = router.db;

  // بررسی تکراری نبودن username (هم در کاربران و هم معلمین)
  const userExists = db.get('users').find({ username }).value();
  const teacherExists = db.get('teachers').find({ username }).value();

  if (userExists || teacherExists) {
    return res.status(400).json({ error: 'نام کاربری قبلا ثبت شده است' });
  }

  // هش کردن رمز عبور
  const hashedPassword = await bcrypt.hash(password, 10);

  // ایجاد حساب جدید
  const newAccount = {
    id: crypto.randomUUID(),
    username,
    password: hashedPassword,
    email,
    phonenumber,
    fullname,
    isBanned : false
  };

  // ذخیره در جدول مناسب بر اساس نقش
  if (role === 'teacher') {
    let {stack , courseIds} = req.body
    db.get('teachers').push({...newAccount ,courseIds , stack}).write();
  } else {
    db.get('users').push({
      ...newAccount,
      purchasedCourses: []
    }).write();
  }

  res.status(201).json({ 
    message: 'ثبت‌نام موفق', 
    userId: newAccount.id,
    role
  });
});

/**
 * @api {post} /login ورود کاربران و معلمین
 * @apiBody {String} username نام کاربری
 * @apiBody {String} password رمز عبور
 */
server.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = router.db;

  // جستجو در کاربران عادی
  const user = db.get('users').find({ username }).value();
  
  // اگر کاربر عادی نبود، در معلمین جستجو کن
  const teacher = user ? null : db.get('teachers').find({ username }).value();
  const account = user || teacher;

  if (!account || !(await bcrypt.compare(password, account.password))) {
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور نادرست' });
  }

  if (account.isBanned) {
    return res.status(403).json({ error: 'حساب شما مسدود شده است' });
  }

  // تشخیص نوع حساب (کاربر یا معلم)
  const role = teacher ? 'teacher' : 'user';
  const token = jwt.sign({ userId: account.id, role }, SECRET_KEY, {
    expiresIn: TOKEN_EXPIRY,
  });

  res.json({ 
    token, 
    userId: account.id,
    role // اضافه کردن نقش به پاسخ
  });
});

/**
 * @api {get} /validate/token بررسی انقضای توکن کاربر
 * @apiHeader {String} Authorization توکن کاربر (Bearer Token)
 */
server.get("/validate/token", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ valid: false, error: "توکن وجود ندارد" });
  }

  // بررسی اعتبار توکن بدون بررسی در دیتابیس (فقط انقضا)
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(200).json({
        valid: false,
        error: "توکن منقضی شده یا نامعتبر است",
      });
    }
    res.json({ valid: true, userId: user.userId });
  });
});

/**
 * @api {post} /ban بن/رفع بن کاربران و معلمین
 * @apiHeader {String} Authorization توکن ادمین
 * @apiBody {String} targetId شناسه کاربر/معلم
 * @apiBody {Boolean} isBanned وضعیت بن
 * @apiBody {String} targetType نوع حساب (user/teacher)
 */
server.post('/ban', (req, res) => {
  const { targetId, isBanned, targetType = 'user' } = req.body;
  const db = router.db;

  // اعتبارسنجی ورودی‌ها
  if (typeof isBanned !== 'boolean') {
    return res.status(400).json({ error: 'مقدار isBanned باید true/false باشد' });
  }

  if (targetType !== 'user' && targetType !== 'teacher') {
    return res.status(400).json({ error: 'نوع هدف نامعتبر (فقط user یا teacher)' });
  }

  // پیدا کردن جدول هدف
  const targetTable = targetType === 'user' ? db.get('users') : db.get('teachers');
  const target = targetTable.find({ id: targetId }).value();

  if (!target) {
    return res.status(404).json({ error: `${targetType === 'user' ? 'کاربر' : 'معلم'} یافت نشد` });
  }

  // اعمال تغییرات
  targetTable.find({ id: targetId }).assign({ isBanned }).write();

  res.json({
    success: true,
    message: `${targetType === 'user' ? 'کاربر' : 'معلم'} ${isBanned ? 'بن' : 'رفع بن'} شد`,
    targetType,
    targetId
  });
});

/**
 * @api {post} /purchase خرید دوره
 */
server.post("/purchase", (req, res) => {
  const { userId, courseIds } = req.body;

  if (!Array.isArray(courseIds)) {
    return res.status(400).json({ error: "courseIds باید آرایه باشد" });
  }

  const db = router.db;
  const user = db.get("users").find({ id: userId }).value();

  if (!user) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }

  const updatedCourses = [...new Set([...user.purchasedCourses, ...courseIds])];

  db.get("users")
    .find({ id: userId })
    .assign({ purchasedCourses: updatedCourses })
    .write();

  res.json({
    success: true,
    purchasedCourses: updatedCourses,
  });
});


/**
 * @api {get} /teachers/:teacherId/courses دریافت دوره‌های یک معلم
 * @apiParam {String} teacherId شناسه معلم
 */
server.get('/teachers/:teacherId/courses', (req, res) => {
  const { teacherId } = req.params;
  const db = router.db;

  const teacher = db.get('teachers').find({ id: teacherId }).value();
  if (!teacher) {
    return res.status(404).json({ error: 'معلم یافت نشد' });
  }

  // دریافت تمام دوره‌های این معلم از جدول courses
  const teacherCourses = db.get('courses')
    .filter(course => teacher.courseIds.includes(course.id))
    .value();

  res.json({
    teacher: {
      id: teacher.id,
      fullname: teacher.fullname,
    },
    courses: teacherCourses
  });
});

/**
 * @api {get} /user-courses دریافت دوره‌های کاربر
 */
server.get("/user-courses/:userId", (req, res) => {
  const { userId } = req.params;

  const db = router.db;
  const user = db.get("users").find({ id: userId }).value();

  if (!user) {
    return res.status(404).json({ error: "کاربر یافت نشد" });
  }

  const courses = db
    .get("courses")
    .filter((course) => user.purchasedCourses.includes(course.id))
    .value();

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    courses,
  });
});

/**
 * @api {post} /offs/all اعمال تخفیف به همه دوره‌ها
 */
server.post("/offs/all", (req, res) => {
  const { percentage } = req.body;

  if (!percentage || percentage < 0 || percentage > 100) {
    return res.status(400).json({ error: "درصد تخفیف نامعتبر است (0-100)" });
  }

  const db = router.db;
  const courses = db.get("courses").value();

  courses.forEach((course) => {
    const originalPrice = course.originalPrice || course.price;
    const discountedPrice = (originalPrice * (100 - percentage)) / 100;

    db.get("courses")
      .find({ id: course.id })
      .assign({
        discount: percentage,
        price: discountedPrice,
        originalPrice,
      })
      .write();
  });

  res.json({
    success: true,
    message: `تخفیف ${percentage}% به همه دوره‌ها اعمال شد`,
  });
});

/**
 * @api {post} /offs/:courseId اعمال تخفیف به دوره خاص
 */
server.post("/offs/:courseId", (req, res) => {
  const { percentage } = req.body;
  const { courseId } = req.params;

  if (!percentage || percentage < 0 || percentage > 100) {
    return res.status(400).json({ error: "درصد تخفیف نامعتبر است (0-100)" });
  }

  const db = router.db;
  const course = db.get("courses").find({ id: courseId }).value();

  if (!course) {
    return res.status(404).json({ error: "دوره یافت نشد" });
  }

  const originalPrice = course.originalPrice || course.price;
  const discountedPrice = (originalPrice * (100 - percentage)) / 100;

  db.get("courses")
    .find({ id: courseId })
    .assign({
      discount: percentage,
      price: discountedPrice,
      originalPrice,
    })
    .write();

  res.json({
    success: true,
    message: `تخفیف ${percentage}% به دوره اعمال شد`,
    newPrice: discountedPrice,
  });
});

// آپلود عکس دوره
/**
 * @api {post} /upload-course-image اعمال تخفیف به دوره خاص
 * @api {body} courseImage
 * @api {body} courseId
 */
server.post(
  "/upload-course-image",
  upload.single("courseImage"),
  (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "هیچ فایلی آپلود نشد" });

    const db = router.db;
    const courseId = req.body.courseId;
    const imageUrl = `/uploads/courses/${req.file.filename}`;

    db.get("courses")
      .find({ id: courseId })
      .assign({ image: imageUrl })
      .write();

    res.json({ imageUrl });
  }
);

// آپلود ویدئو جلسه

/**
 * @api {post} /upload-session-video اعمال تخفیف به دوره خاص
 * @api {body} video
 * @api {body} sessionId
 */
server.post("/upload-session-video", upload.single("video"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "هیچ فایلی آپلود نشد" });

  const db = router.db;
  const sessionId = req.body.sessionId;
  const videoUrl = `/uploads/videos/${req.file.filename}`;

  db.get("sessions").find({ id: sessionId }).assign({ videoUrl }).write();

  res.json({ videoUrl });
});

// استفاده از روتر json-server
server.use(router);

// راه‌اندازی سرور
server.listen(8080, () => {
  console.log("سرور API در حال اجرا است: http://localhost:8080");
  console.log("مستندات API:");
  console.log(`
  ================================================
  | API Endpoint          | Method | Description |
  ================================================
  | /register            | POST   | ثبت‌نام کاربر |
  | /login               | POST   | ورود کاربر   |
  | /ban                 | POST   | بن کردن کاربر|
  | /purchase            | POST   | خرید دوره‌ها |
  | /user-courses/:userId| GET    | دوره‌های کاربر|
  | /offs/all            | POST   | تخفیف کلی    |
  | /offs/:courseId      | POST   | تخفیف دوره   |
  | /upload-course-image | POST   | آپلود عکس دوره|
  | /upload-session-video| POST   | آپلود ویدئو  |
  ================================================
  `);
});
