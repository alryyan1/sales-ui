# إعداد نظام الإشعارات - خطوات الإكمال

## الخطوات المطلوبة لإكمال إعداد نظام الإشعارات

### 1. تشغيل Migration (مطلوب)

قم بتشغيل migration لإنشاء جدول الإشعارات في قاعدة البيانات:

```bash
cd C:\xampp\htdocs\sales-api
php artisan migrate
```

أو إذا كنت تريد تشغيل migration محدد فقط:

```bash
php artisan migrate --path=database/migrations/2025_12_30_192535_create_notifications_table.php
```

### 2. إعداد Queue Workers (مطلوب للإشعارات الفورية)

نظراً لأن `SendNotificationListener` يستخدم `ShouldQueue`، يجب تشغيل queue workers لمعالجة الإشعارات:

#### الخيار 1: استخدام Queue Driver (موصى به للإنتاج)

في ملف `.env`:
```env
QUEUE_CONNECTION=database
```

ثم قم بإنشاء جدول jobs:
```bash
php artisan queue:table
php artisan migrate
```

ثم قم بتشغيل worker:
```bash
php artisan queue:work
```

#### الخيار 2: تعطيل Queue (للاختبار فقط)

إذا كنت تريد أن تعمل الإشعارات بشكل متزامن (synchronous) بدون queue، قم بتعديل `SendNotificationListener.php`:

```php
// احذف implements ShouldQueue
class SendNotificationListener // implements ShouldQueue
{
    // احذف use InteractsWithQueue;
    // use InteractsWithQueue;
}
```

### 3. إعداد Broadcasting (اختياري - للإشعارات الفورية)

حالياً النظام يستخدم polling (كل 30 ثانية). لإضافة دعم socket.io الفوري:

#### أ. تثبيت Laravel Echo Server أو استخدام Pusher

#### ب. إعداد Broadcasting في `.env`:
```env
BROADCAST_DRIVER=pusher
# أو
BROADCAST_DRIVER=log  # للاختبار فقط
```

#### ج. تفعيل socket.io في `NotificationContext.tsx` (الكود موجود لكن معطل)

### 4. اختبار النظام

#### أ. اختبار إشعارات المخزون:
1. قم بتعديل منتج ليكون مخزونه أقل من `stock_alert_level`
2. يجب أن تظهر إشعارات للمستخدمين الذين لديهم أدوار `admin` أو `manager`

#### ب. اختبار إشعارات المبيعات:
1. قم بإنشاء بيع جديد
2. يجب أن تظهر إشعارات للمدراء

#### ج. اختبار إشعارات المشتريات:
1. قم بتغيير حالة مشتريات إلى "received"
2. يجب أن تظهر إشعارات

### 5. التحقق من الأدوار (Roles)

تأكد من أن المستخدمين لديهم الأدوار الصحيحة:
- `admin` أو `manager` - سيحصلون على جميع الإشعارات
- المستخدمون الآخرون - لن يحصلوا على إشعارات (حالياً)

يمكنك تعديل `SendNotificationListener.php` لتغيير من يحصل على الإشعارات.

### 6. إعدادات إضافية (اختيارية)

#### تغيير فترة Polling:
في `NotificationContext.tsx`، يمكنك تغيير:
```typescript
const pollInterval = setInterval(() => {
  refreshUnreadCount();
}, 30000); // 30 ثانية - يمكنك تغييرها
```

#### إضافة أنواع إشعارات جديدة:
1. أنشئ Notification class جديد في `app/Notifications/`
2. أنشئ Event جديد في `app/Events/`
3. أضف Listener method في `SendNotificationListener.php`
4. سجل Event في `EventServiceProvider.php`
5. أضف النوع في `notificationService.ts` (NotificationType)

## ملاحظات مهمة

1. **Queue Workers**: بدون queue workers، الإشعارات ستُحفظ في قاعدة البيانات لكن قد لا تُرسل فوراً
2. **Broadcasting**: حالياً النظام يعمل بدون broadcasting (polling فقط). للإشعارات الفورية، تحتاج لإعداد socket.io
3. **الأدوار**: تأكد من أن المستخدمين لديهم الأدوار الصحيحة في قاعدة البيانات

## حالة النظام الحالية

✅ **جاهز للاستخدام**: النظام يعمل حالياً مع polling كل 30 ثانية
⚠️ **Queue Workers**: مطلوب لتشغيل الإشعارات بشكل فوري
⚠️ **Broadcasting**: اختياري للإشعارات الفورية الحقيقية

