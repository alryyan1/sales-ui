import React, { useState } from "react";
import ReactJson from "react-json-view";
import { Box, Paper, Typography, IconButton, Collapse } from "@mui/material";
import { ChevronDown, ChevronUp, X, Bug } from "lucide-react";

interface DebugPanelProps {
  data: any;
  title?: string;
  isOpen?: boolean;
}

/**
 * A handy debug panel to visualize component data/state.
 * Uses react-json-view for interactive inspection.
 */
const DebugPanel: React.FC<DebugPanelProps> = ({
  data,
  title = "Debug Data",
  isOpen = false,
}) => {
  const [open, setOpen] = useState(isOpen);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  // Only render in development mode primarily, but useful for testing
  if (process.env.NODE_ENV === "production") {
    // Uncomment to hide in production
    // return null;
  }

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 16,
        right: 90, // Next to Query Devtools
        zIndex: 9999,
        width: open ? 400 : "auto",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          p: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          cursor: "pointer",
        }}
        onClick={() => setOpen(!open)}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Bug size={16} />
          {open && (
            <Typography variant="subtitle2" fontWeight="bold">
              {title}
            </Typography>
          )}
        </Box>
        <Box>{open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</Box>
      </Box>

      <Collapse in={open}>
        <Box sx={{ p: 0, overflow: "auto", maxHeight: "calc(80vh - 40px)" }}>
          <ReactJson
            src={data}
            theme="rjv-default"
            displayDataTypes={false}
            enableClipboard={true}
            collapsed={1} // Collapse to level 1 for cleaner view
            style={{ padding: "16px", fontSize: "12px" }}
          />
        </Box>
      </Collapse>

      {open && (
        <IconButton
          size="small"
          sx={{ position: "absolute", top: 4, right: 4, color: "white" }}
          onClick={(e) => {
            e.stopPropagation();
            setVisible(false);
          }}
        >
          <X size={14} />
        </IconButton>
      )}
    </Paper>
  );
};

export default DebugPanel;
