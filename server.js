const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('./DB/deepseek_json_20250624_124bdd.json')
const middlewares = jsonServer.defaults()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

server.use(middlewares)
server.use(jsonServer.bodyParser)

// تنظیمات
const SECRET_KEY = 'your-very-secure-key-123!@#'
const TOKEN_EXPIRY = '1h'

// --- Middleware احراز هویت ---
server.use((req, res, next) => {
  if (req.path === '/register' || req.path === '/login') return next()
  
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) return res.status(401).json({ error: 'دسترسی غیرمجاز' })

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'توکن نامعتبر' })
    req.user = user
    next()
  })
})

// --- روت‌های API ---

/**
 * @api {post} /register ثبت‌نام کاربر
 * @apiBody {String} username نام کاربری
 * @apiBody {String} password رمز عبور
 * @apiBody {String} email ایمیل
 * @apiBody {String} phonenumber شماره تلفن
 * @apiBody {String} fullname نام و نام خانوادگی
 */
server.post('/register', async (req, res) => {
  const { username, password, email , phonenumber , fullname } = req.body
  
  if (!username || !password || !email || !phonenumber || !fullname) {
    return res.status(400).json({ error: 'تمام فیلدها الزامی هستند' })
  }

  const db = router.db
  const exists = db.get('users').find({ username }).value()
  
  if (exists) {
    return res.status(400).json({ error: 'نام کاربری موجود است' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  
  const user = {
    id: crypto.randomUUID(),
    username,
    role : 'user',
    password: hashedPassword,
    phonenumber,
    fullname,
    email,
    isBanned: false,
    purchasedCourses: []
  }

  db.get('users').push(user).write()
  res.status(201).json({ message: 'ثبت‌نام موفق' })
})

/**
 * @api {post} /login ورود کاربر
 * @apiBody {String} username نام کاربری
 * @apiBody {String} password رمز عبور
 */
server.post('/login', async (req, res) => {
  const { username, password } = req.body
  
  const db = router.db
  const user = db.get('users').find({ username }).value()

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور نادرست' })
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'حساب شما مسدود شده است' })
  }

  const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: TOKEN_EXPIRY })
  res.json({ token, userId: user.id })
})

/**
 * @api {post} /ban بن/رفع بن کاربر
 * @apiHeader {String} Authorization توکن احراز هویت
 * @apiBody {String} userId شناسه کاربر
 * @apiBody {Boolean} isBanned وضعیت بن
 */
server.post('/ban', (req, res) => {
  const { userId, isBanned } = req.body
  
  if (typeof isBanned !== 'boolean') {
    return res.status(400).json({ error: 'مقدار isBanned باید true/false باشد' })
  }

  const db = router.db
  const user = db.get('users').find({ id: userId }).value()

  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' })
  }

  db.get('users')
    .find({ id: userId })
    .assign({ isBanned })
    .write()

  res.json({ success: true, message: `کاربر ${isBanned ? 'بن' : 'رفع بن'} شد` })
})

/**
 * @api {post} /purchase خرید دوره
 * @apiHeader {String} Authorization توکن احراز هویت
 * @apiBody {String} userId شناسه کاربر
 * @apiBody {String[]} courseIds آرایه شناسه دوره‌ها
 */
server.post('/purchase', (req, res) => {
  const { userId, courseIds } = req.body
  
  if (!Array.isArray(courseIds)) {
    return res.status(400).json({ error: 'courseIds باید آرایه باشد' })
  }

  const db = router.db
  const user = db.get('users').find({ id: userId }).value()

  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' })
  }

  // اضافه کردن دوره‌های جدید (بدون تکرار)
  const updatedCourses = [...new Set([...user.purchasedCourses, ...courseIds])]
  
  db.get('users')
    .find({ id: userId })
    .assign({ purchasedCourses: updatedCourses })
    .write()

  res.json({ 
    success: true,
    purchasedCourses: updatedCourses
  })
})

/**
 * @api {get} /user-courses دریافت دوره‌های کاربر
 * @apiHeader {String} Authorization توکن احراز هویت
 * @apiParam {String} userId شناسه کاربر
 */
server.get('/user-courses/:userId', (req, res) => {
  const { userId } = req.params

  const db = router.db
  const user = db.get('users').find({ id: userId }).value()

  if (!user) {
    return res.status(404).json({ error: 'کاربر یافت نشد' })
  }

  const courses = db.get('courses')
    .filter(course => user.purchasedCourses.includes(course.id))
    .value()

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    courses
  })
})

/**
 * @api {post} /offs/all اعمال تخفیف به همه دوره‌ها
 * @apiHeader {String} Authorization توکن احراز هویت
 * @apiBody {Number} percentage درصد تخفیف
 */
server.post('/offs/all', (req, res) => {
  const { percentage } = req.body
  
  if (!percentage || percentage < 0 || percentage > 100) {
    return res.status(400).json({ error: 'درصد تخفیف نامعتبر است (0-100)' })
  }

  const db = router.db
  const courses = db.get('courses').value()

  courses.forEach(course => {
    const originalPrice = course.originalPrice || course.price
    const discountedPrice = originalPrice * (100 - percentage) / 100
    
    db.get('courses')
      .find({ id: course.id })
      .assign({ 
        discount: percentage,
        price: discountedPrice,
        originalPrice
      })
      .write()
  })

  res.json({ success: true, message: `تخفیف ${percentage}% به همه دوره‌ها اعمال شد` })
})

/**
 * @api {post} /offs/:courseId اعمال تخفیف به دوره خاص
 * @apiHeader {String} Authorization توکن احراز هویت
 * @apiParam {String} courseId شناسه دوره
 * @apiBody {Number} percentage درصد تخفیف
 */
server.post('/offs/:courseId', (req, res) => {
  const { percentage } = req.body
  const { courseId } = req.params

  if (!percentage || percentage < 0 || percentage > 100) {
    return res.status(400).json({ error: 'درصد تخفیف نامعتبر است (0-100)' })
  }

  const db = router.db
  const course = db.get('courses').find({ id: courseId }).value()

  if (!course) {
    return res.status(404).json({ error: 'دوره یافت نشد' })
  }

  const originalPrice = course.originalPrice || course.price
  const discountedPrice = originalPrice * (100 - percentage) / 100
  
  db.get('courses')
    .find({ id: courseId })
    .assign({ 
      discount: percentage,
      price: discountedPrice,
      originalPrice
    })
    .write()

  res.json({ 
    success: true,
    message: `تخفیف ${percentage}% به دوره اعمال شد`,
    newPrice: discountedPrice
  })
})

server.use(router)
server.listen(8080, () => {
  console.log('سرور API در حال اجرا است: http://localhost:8080')
  console.log('مستندات API:')
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
  ================================================
  `)
})