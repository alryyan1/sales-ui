// src/components/admin/WhatsAppScheduler.tsx
import React from "react";

// shadcn/ui Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// Icons
import { Clock, MessageCircle } from "lucide-react";

const WhatsAppSchedulerComponent: React.FC = () => {
  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <CardTitle>جدولة واتساب</CardTitle>
        </div>
        <CardDescription>
          جدولة إرسال التقارير عبر واتساب تلقائياً
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">جدولة واتساب</p>
          <p className="text-sm">
            قم بجدولة إرسال التقارير عبر واتساب في أوقات محددة
          </p>
          <p className="text-xs mt-2 text-gray-400">
            قريباً
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppSchedulerComponent; 