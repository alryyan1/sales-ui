// src/components/admin/users/UserFormModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Checkbox,
  ConfigProvider,
  Divider,
  Form,
  Input,
  Modal,
  Progress,
  Select,
  Typography,
  theme as antdTheme,
} from "antd";
import arEG from "antd/locale/ar_EG";
import { KeyRound, PanelLeft, Settings2, ShieldCheck, UserRound } from "lucide-react";

import { useTheme } from "@/context/ThemeContext";

// Services and Types
import userService, { Role } from "@/services/userService";
import { User } from "@/services/authService";
import { warehouseService, Warehouse } from "@/services/warehouseService";

// Custom Components
import NavigationPermissionsSection from "./NavigationPermissionsSection";

const { Text } = Typography;

// --- Props ---
interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
  onSaveSuccess: (user: User) => void;
  availableRoles: Role[];
}

type UserFormValues = {
  name: string;
  username: string;
  password: string;
  password_confirmation: string;
  roles: string[];
  warehouse_id: number | null;
};

function isAdminRoleName(name: string) {
  return name === "admin" || name === "ادمن";
}

function getPasswordStrength(password: string): {
  label: string;
  color: string;
  percent: number;
} {
  if (!password) return { label: "", color: "", percent: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const percent = (score / 5) * 100;
  if (score <= 1) return { label: "ضعيفة جداً", color: "#ff4d4f", percent };
  if (score === 2) return { label: "ضعيفة", color: "#faad14", percent };
  if (score === 3) return { label: "متوسطة", color: "#1677ff", percent };
  if (score === 4) return { label: "جيدة", color: "#1677ff", percent };
  return { label: "قوية", color: "#52c41a", percent };
}

const SectionLabel: React.FC<{ icon: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode }> = ({
  icon,
  children,
  extra,
}) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(0,0,0,0.45)" }}>
      {icon}
      <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, letterSpacing: 0.4 }}>
        {children}
      </Text>
    </span>
    {extra}
  </div>
);

const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSaveSuccess,
  availableRoles,
}) => {
  const { resolvedTheme } = useTheme();
  const [form] = Form.useForm<UserFormValues>();

  const isEditMode = Boolean(userToEdit);
  const isSuperadmin = userToEdit?.username === "superadmin";

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const [navPermissionsOpen, setNavPermissionsOpen] = useState(false);
  const [allowedNavs, setAllowedNavs] = useState<string[] | null>(null);

  const passwordValue = Form.useWatch("password", form) ?? "";
  const nameValue = Form.useWatch("name", form) ?? "";

  useEffect(() => {
    if (!isOpen) return;
    setLoadingWarehouses(true);
    warehouseService
      .getAll()
      .then(setWarehouses)
      .catch(console.error)
      .finally(() => setLoadingWarehouses(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    setNavPermissionsOpen(false);

    if (isEditMode && userToEdit) {
      const navs = userToEdit.allowed_navs;
      const normalizedNavs = navs === null ? null : Array.isArray(navs) ? navs : [];
      setAllowedNavs(normalizedNavs);
      form.setFieldsValue({
        name: userToEdit.name || "",
        username: userToEdit.username || "",
        password: "",
        password_confirmation: "",
        roles: userToEdit.roles || [],
        warehouse_id: userToEdit.warehouse_id || null,
      });
    } else {
      setAllowedNavs([]);
      form.resetFields();
    }
  }, [isOpen, isEditMode, userToEdit, form]);

  const onFinish = async (data: UserFormValues) => {
    setServerError(null);
    setSubmitting(true);
    const warehouseId = data.warehouse_id ?? null;
    try {
      let savedUser: User;
      if (isEditMode && userToEdit) {
        savedUser = await userService.updateUser(userToEdit.id, {
          name: data.name,
          username: data.username,
          roles: data.roles,
          warehouse_id: warehouseId,
          allowed_navs: allowedNavs,
        });
      } else {
        savedUser = await userService.createUser({
          ...data,
          warehouse_id: warehouseId,
          allowed_navs: allowedNavs,
        });
      }
      onSaveSuccess(savedUser);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to save user:", err);
      const generalError = userService.getErrorMessage(err);
      const apiErrors = userService.getValidationErrors(err);

      if (apiErrors) {
        const fields = Object.entries(apiErrors)
          .filter(([field]) => ["name", "username", "password", "roles"].includes(field))
          .map(([field, messages]) => ({ name: field as keyof UserFormValues, errors: [messages[0]] }));
        if (fields.length) form.setFields(fields);
        setServerError("يرجى التحقق من الحقول المُشار إليها وتصحيحها");
      } else {
        setServerError(generalError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pwStrength = getPasswordStrength(passwordValue);

  const navSummaryLabel = useMemo(() => {
    if (allowedNavs === null) return "كل الصفحات متاحة";
    if (allowedNavs.length === 0) return "لم يتم تحديد أي صفحة بعد";
    return `${allowedNavs.length} صفحة محددة`;
  }, [allowedNavs]);

  const initials = (userToEdit?.name || nameValue || "؟").trim().charAt(0).toUpperCase();

  return (
    <ConfigProvider
      direction="rtl"
      locale={arEG}
      theme={{ algorithm: resolvedTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm }}
    >
      <AntApp>
        <Modal
          open={isOpen}
          onCancel={() => !submitting && onClose()}
          width={860}
          maskClosable={!submitting}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar style={{ backgroundColor: "#e6f4ff", color: "#1677ff", fontWeight: 600 }}>
                {initials}
              </Avatar>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {isEditMode ? `تعديل: ${userToEdit?.name}` : "إضافة مستخدم جديد"}
                </div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                  {isEditMode
                    ? "تعديل بيانات وصلاحيات المستخدم"
                    : "أدخل بيانات المستخدم الجديد وحدد صلاحياته"}
                </Text>
              </div>
            </div>
          }
          styles={{ body: { maxHeight: "70vh", overflowY: "auto", paddingTop: 12 } }}
          okText={isEditMode ? "حفظ التعديلات" : "إنشاء المستخدم"}
          cancelText="إلغاء"
          confirmLoading={submitting}
          onOk={() => form.submit()}
        >
          {serverError && (
            <Alert type="error" showIcon message={serverError} style={{ marginBottom: 16 }} />
          )}

          <Form<UserFormValues>
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              name: "",
              username: "",
              password: "",
              password_confirmation: "",
              roles: [],
              warehouse_id: null,
            }}
          >
            {/* ── Basic info ── */}
            <SectionLabel icon={<UserRound size={14} />}>البيانات الأساسية</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <Form.Item
                name="name"
                label="الاسم الكامل"
                rules={[{ required: true, message: "هذا الحقل مطلوب" }]}
              >
                <Input placeholder="أدخل الاسم الكامل" />
              </Form.Item>
              <Form.Item
                name="username"
                label="اسم المستخدم"
                rules={[{ required: true, message: "هذا الحقل مطلوب" }]}
              >
                <Input placeholder="username" dir="ltr" style={{ fontFamily: "monospace" }} />
              </Form.Item>
              <Form.Item name="warehouse_id" label="المستودع الرئيسي">
                <Select
                  allowClear
                  loading={loadingWarehouses}
                  placeholder={loadingWarehouses ? "جاري التحميل..." : "— غير محدد (افتراضي)"}
                  options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                />
              </Form.Item>
            </div>

            {/* ── Password (create only) ── */}
            {!isEditMode && (
              <>
                <Divider style={{ margin: "4px 0 16px" }} />
                <SectionLabel icon={<KeyRound size={14} />}>كلمة المرور</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <Form.Item
                    name="password"
                    label="كلمة المرور"
                    rules={[
                      { required: true, message: "كلمة المرور مطلوبة" },
                      { min: 8, message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" },
                    ]}
                    extra={
                      passwordValue ? (
                        <div style={{ marginTop: 6 }}>
                          <Progress
                            percent={pwStrength.percent}
                            showInfo={false}
                            strokeColor={pwStrength.color}
                            size="small"
                          />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            قوة كلمة المرور:{" "}
                            <span style={{ color: pwStrength.color, fontWeight: 500 }}>{pwStrength.label}</span>
                          </Text>
                        </div>
                      ) : undefined
                    }
                  >
                    <Input.Password placeholder="8 أحرف على الأقل" />
                  </Form.Item>
                  <Form.Item
                    name="password_confirmation"
                    label="تأكيد كلمة المرور"
                    dependencies={["password"]}
                    rules={[
                      { required: true, message: "يرجى تأكيد كلمة المرور" },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue("password") === value) return Promise.resolve();
                          return Promise.reject(new Error("كلمات المرور غير متطابقة"));
                        },
                      }),
                    ]}
                  >
                    <Input.Password placeholder="أعد إدخال كلمة المرور" />
                  </Form.Item>
                </div>
              </>
            )}

            <Divider style={{ margin: "4px 0 16px" }} />

            {/* ── Roles ── */}
            <SectionLabel
              icon={<ShieldCheck size={14} />}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {availableRoles.length} دور متاح
                </Text>
              }
            >
              الأدوار الوظيفية
            </SectionLabel>
            <Form.Item
              name="roles"
              rules={[{ required: true, message: "يجب اختيار دور واحد على الأقل" }]}
            >
              <Checkbox.Group
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}
                options={availableRoles.map((role) => ({
                  label: role.name,
                  value: role.name,
                  disabled: isAdminRoleName(role.name) && isSuperadmin,
                }))}
              />
            </Form.Item>

            <Divider style={{ margin: "4px 0 16px" }} />

            {/* ── Navigation permissions — summary row, editing in its own dialog ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <PanelLeft size={14} style={{ flexShrink: 0, color: "rgba(0,0,0,0.45)" }} />
                <div style={{ minWidth: 0 }}>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, display: "block" }}>
                    القوائم الجانبية
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                    {navSummaryLabel}
                  </Text>
                </div>
              </div>
              <Button
                icon={<Settings2 size={14} />}
                onClick={() => setNavPermissionsOpen(true)}
                style={{ flexShrink: 0 }}
              >
                تخصيص القوائم الجانبية
              </Button>
            </div>
          </Form>
        </Modal>

        {/* ── Sidebar navigation customization — its own dialog, on top of the user form ── */}
        <Modal
          open={navPermissionsOpen}
          onCancel={() => setNavPermissionsOpen(false)}
          onOk={() => setNavPermissionsOpen(false)}
          okText="تم"
          cancelButtonProps={{ style: { display: "none" } }}
          width={680}
          title="تخصيص القوائم الجانبية"
          styles={{ body: { maxHeight: "65vh", overflowY: "auto" } }}
        >
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            اختر الصفحات التي تظهر في القائمة الجانبية لهذا المستخدم.
          </Text>
          <NavigationPermissionsSection
            value={allowedNavs}
            onChange={setAllowedNavs}
            isSuperadmin={isSuperadmin}
          />
        </Modal>
      </AntApp>
    </ConfigProvider>
  );
};

export default UserFormModal;
