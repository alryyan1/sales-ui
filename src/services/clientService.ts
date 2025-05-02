// src/services/clientService.ts
import apiClient, { getValidationErrors, getErrorMessage, ApiErrorResponse } from '../lib/axios'; // استيراد المثيل المهيأ ودوال المساعدة
import { AxiosError } from 'axios';

// 1. واجهة بيانات العميل (Client Interface)
// يجب أن تتطابق هذه الواجهة مع الحقول التي يتم إرجاعها بواسطة ClientResource في Laravel
export interface Client {
    id: number;
    name: string;
    email: string | null; // قد يكون البريد الإلكتروني اختياريًا
    phone: string | null; // قد يكون الهاتف اختياريًا
    address: string | null; // قد يكون العنوان اختياريًا
    created_at: string; // تاريخ الإنشاء كسلسلة نصية (ISO format)
    updated_at: string; // تاريخ التحديث كسلسلة نصية (ISO format)
    // أضف أي حقول أخرى يتم إرجاعها بواسطة الـ API Resource هنا
    // مثال: إذا قمت بإضافة عدد المبيعات
    // sales_count?: number;
}

// 2. نوع بيانات فورم العميل (Client Form Data Type)
// يمثل البيانات المطلوبة عند إنشاء أو تحديث عميل (بدون الحقول التي يولدها النظام)
export type ClientFormData = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
// Omit تستبعد الحقول المحددة من النوع الأساسي Client

// 3. واجهة الاستجابة المقسمة لصفحات (Paginated Response Interface)
// يجب أن تتطابق مع بنية الاستجابة الافتراضية لـ Laravel Pagination
export interface PaginatedResponse<T> {
    current_page: number;
    data: T[]; // مصفوفة من نوع البيانات (مثل Client[])
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: { url: string | null; label: string; active: boolean }[]; // روابط التنقل بين الصفحات
    next_page_url: string | null;
    path: string;
    per_page: number; // عدد العناصر في كل صفحة
    prev_page_url: string | null;
    to: number;
    total: number; // العدد الإجمالي للعناصر
}

// 4. خدمة العملاء (Client Service Object)
const clientService = {

    /**
     * جلب قائمة العملاء مع التقسيم لصفحات.
     * @param {number} page - رقم الصفحة المطلوب (افتراضيًا 1).
     * @returns {Promise<PaginatedResponse<Client>>} وعد يحتوي على بيانات العملاء المقسمة.
     */
    getClients: async (page: number = 1): Promise<PaginatedResponse<Client>> => {
        try {
            // استخدام apiClient لإرسال طلب GET مع رقم الصفحة كـ query parameter
            const response = await apiClient.get<PaginatedResponse<Client>>(`/clients?page=${page}`);
            console.log('getClients response:', response.data); // للمساعدة في التصحيح
            return response.data; // إرجاع بيانات الاستجابة
        } catch (error) {
            console.error('Error fetching clients:', error);
            throw error; // إعادة رمي الخطأ ليتم التعامل معه في المكون الذي استدعى الدالة
        }
    },

    /**
     * جلب بيانات عميل واحد بواسطة الـ ID الخاص به.
     * @param {number} id - معرّف العميل المطلوب.
     * @returns {Promise<Client>} وعد يحتوي على بيانات العميل.
     */
    getClient: async (id: number): Promise<Client> => {
        try {
            const response = await apiClient.get<Client>(`/clients/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching client ${id}:`, error);
            throw error;
        }
    },

    /**
     * إنشاء عميل جديد.
     * @param {ClientFormData} clientData - بيانات العميل الجديد.
     * @returns {Promise<Client>} وعد يحتوي على بيانات العميل الذي تم إنشاؤه (كما تم إرجاعها من الـ API).
     */
    createClient: async (clientData: ClientFormData): Promise<Client> => {
        try {
            // إرسال طلب POST مع بيانات العميل في جسم الطلب
            const response = await apiClient.post<{ client: Client }>('/clients', clientData); // قد يعيد الـ API الكائن داخل مفتاح 'client' أو مباشرة
            // تحقق من بنية الاستجابة الفعلية من الـ API الخاص بك
            // إذا كان الـ API يعيد { client: { ... } }
             // return response.data.client;
             // إذا كان الـ API يعيد مباشرة { id: ..., name: ... }
             return response.data as Client; // اضبط هذا حسب الحاجة
        } catch (error) {
            console.error('Error creating client:', error);
            throw error;
        }
    },

    /**
     * تحديث بيانات عميل موجود.
     * @param {number} id - معرّف العميل المراد تحديثه.
     * @param {Partial<ClientFormData>} clientData - بيانات العميل المحدثة (Partial يسمح بإرسال جزء من الحقول فقط).
     * @returns {Promise<Client>} وعد يحتوي على بيانات العميل المحدثة (كما تم إرجاعها من الـ API).
     */
    updateClient: async (id: number, clientData: Partial<ClientFormData>): Promise<Client> => {
        try {
            // استخدام PUT أو PATCH (apiResource في Laravel يعالج كليهما للتحديث)
            const response = await apiClient.put<{ client: Client }>(`/clients/${id}`, clientData); // أو .patch()
             // تحقق من بنية الاستجابة الفعلية
             // return response.data.client;
             return response.data as Client; // اضبط هذا حسب الحاجة
        } catch (error) {
            console.error(`Error updating client ${id}:`, error);
            throw error;
        }
    },

    /**
     * حذف عميل.
     * @param {number} id - معرّف العميل المراد حذفه.
     * @returns {Promise<void>} وعد لا يعيد أي قيمة عند النجاح.
     */
    deleteClient: async (id: number): Promise<void> => {
        try {
            // إرسال طلب DELETE
            await apiClient.delete(`/clients/${id}`);
            // لا يوجد عادةً محتوى يتم إرجاعه عند الحذف الناجح (Status 204 أو 200 مع رسالة)
        } catch (error) {
            console.error(`Error deleting client ${id}:`, error);
            throw error;
        }
    },

    // --- الدوال المساعدة لمعالجة الأخطاء (مستوردة من axios.ts) ---
    // هذه الدوال يمكن استخدامها في المكونات للتعامل مع الأخطاء التي يتم رميها من دوال الخدمة
    getValidationErrors,
    getErrorMessage,
};

// تصدير الكائن ليتم استخدامه في المكونات الأخرى
export default clientService;

// --- يمكنك تصدير الأنواع أيضًا إذا كنت بحاجة إليها مباشرة في المكونات ---
// export type { Client, ClientFormData, PaginatedResponse };