import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import { useRouteError, Link as RouterLink } from 'react-router-dom'; // لاستخدام Link الخاص بالراوتر

const NotFoundPage: React.FC = () => {
  const error = useRouteError() as any;
  console.error("Route Error:", error);

  const errorMessage = error?.message || error?.statusText || "";
  const errorStack = error?.stack || "";

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 150px)',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Typography variant="h1" component="h1" sx={{ fontWeight: 'bold', mb: 2, color: error ? 'error.main' : 'text.primary' }}>
        {error ? 'Error' : '404'}
      </Typography>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        {error ? 'حدث خطأ في النظام' : 'عفواً، الصفحة غير موجودة!'}
      </Typography>
      
      {error ? (
        <Box sx={{ maxWidth: '800px', width: '100%', mb: 4, textAlign: 'left', direction: 'ltr' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Details: {errorMessage}
            </Typography>
          </Alert>
          {errorStack && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa', overflow: 'auto', maxHeight: '300px' }}>
              <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {errorStack}
              </pre>
            </Paper>
          )}
        </Box>
      ) : (
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          يبدو أنك ضللت الطريق. الصفحة التي تبحث عنها غير متاحة.
        </Typography>
      )}

      <Button
        variant="contained"
        component={RouterLink}
        to="/"
      >
        العودة إلى الرئيسية
      </Button>
    </Box>
  );
};

export default NotFoundPage;