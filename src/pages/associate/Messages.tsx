import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import AssociateMessaging from "@/components/associate/AssociateMessaging";
import { AssociateGroupChat } from "@/components/associate/AssociateGroupChat";

const AssociateMessages = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/associate")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isEnglish ? 'Back to Dashboard' : 'Torna alla Dashboard'}
          </Button>
          <h1 className="text-3xl font-bold">
            {isEnglish ? 'Messages' : 'Messaggi'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEnglish ? 'Manage your conversations' : 'Gestisci le tue conversazioni'}
          </p>
        </div>

        <div className="space-y-8">
          <AssociateMessaging language={language} />
          <AssociateGroupChat language={language} />
        </div>
      </div>
    </div>
  );
};

export default AssociateMessages;
