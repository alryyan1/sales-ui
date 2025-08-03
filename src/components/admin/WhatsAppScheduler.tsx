// src/components/admin/WhatsAppScheduler.tsx
import React from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation(["settings", "common"]);

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <CardTitle>{t("settings:whatsappScheduler")}</CardTitle>
        </div>
        <CardDescription>
          {t("settings:whatsappSchedulerDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">{t("settings:whatsappSchedulerTitle")}</p>
          <p className="text-sm">
            {t("settings:whatsappSchedulerDesc2")}
          </p>
          <p className="text-xs mt-2 text-gray-400">
            {t("settings:whatsappSchedulerComingSoon")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppSchedulerComponent; 