import React, { useState } from 'react';
import { useRouteError, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  RefreshCcw, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  FileQuestion,
  ArrowRight,
  Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const NotFoundPage: React.FC = () => {
  const error = useRouteError() as any;
  const location = useLocation();
  const [showDetails, setShowDetails] = useState(false);

  // Determine if it's a 404 or a general crashing error
  const is404 = !error || error.status === 404;
  
  const errorMessage = error?.message || error?.statusText || "حدث خطأ غير متوقع";
  const errorStack = error?.stack || "";
  const statusCode = error?.status || 404;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans" dir="rtl">
      <div className="max-w-2xl w-full text-center">
        {/* Animated Icon Container */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative mb-8"
        >
          <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 shadow-xl overflow-hidden group">
             <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity" />
             {is404 ? (
               <FileQuestion className="w-16 h-16 text-blue-600" />
             ) : (
               <AlertTriangle className="w-16 h-16 text-orange-500" />
             )}
          </div>
          {/* Decorative Circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-blue-200 rounded-full animate-[ping_3s_linear_infinite] opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-blue-100 rounded-full animate-[ping_5s_linear_infinite] opacity-20" />
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-4"
        >
          <h1 className="text-8xl font-black text-slate-900 tracking-tighter">
            {statusCode}
          </h1>
          <h2 className="text-3xl font-bold text-slate-800">
            {is404 ? 'عفواً، ضللت الطريق!' : 'حدث خطأ غير متوقع'}
          </h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
            {is404 
              ? `الصفحة المسار ${location.pathname} غير موجودة أو تم نقلها لمكان آخر.` 
              : 'نعتذر عن هذا الخلل، الفريق التقني يعمل على حل المشكلة.'
            }
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
        >
          <Button 
            asChild
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 px-8 shadow-lg shadow-blue-200 group gap-2"
          >
            <Link to="/">
              <Home className="w-5 h-5" />
              <span>العودة للرئيسية</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
            </Link>
          </Button>
          
          <Button 
            variant="outline"
            size="lg"
            onClick={() => window.location.reload()}
            className="rounded-2xl h-14 px-8 border-slate-200 hover:bg-white hover:border-blue-400 gap-2 transition-all"
          >
            <RefreshCcw className="w-5 h-5 text-slate-400" />
            <span>تحديث الصفحة</span>
          </Button>
        </motion.div>

        {/* Technical Details Toggle */}
        {(error || !is404) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-6 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-slate-400" />
                <span className="font-semibold">تفاصيل الخطأ التقنية</span>
              </div>
              {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden bg-slate-900 text-slate-300 text-left dir-ltr"
                >
                  <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto max-h-[400px]">
                    <div className="flex items-center gap-2 text-red-400 mb-4 border-b border-white/10 pb-4">
                       <AlertTriangle className="w-4 h-4" />
                       <span className="font-bold">Error: {errorMessage}</span>
                    </div>
                    {errorStack ? (
                       <pre className="whitespace-pre-wrap break-all opacity-80">{errorStack}</pre>
                    ) : (
                       <p className="opacity-50 italic">لا تتوفر معلومات إضافية عن الخطأ.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Footer */}
        <p className="mt-12 text-slate-400 text-sm">
          Al-Ryyan Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;