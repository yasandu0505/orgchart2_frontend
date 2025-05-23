// src/components/DepartmentPopover.jsx
import React from "react";
import { Popover, Typography } from "@mui/material";

const DepartmentPopover = ({ anchorEl, isOpen, onClose, entity }) => {
  return (
    <Popover
      style={{ maxHeight: '100%' }}
      sx={{
        ".MuiPopover-paper": {
          backgroundColor: 'rgb(9,9,9)',
          color: 'white',
          padding: '1rem',
        },
      }}
      id="department-popover"
      open={isOpen}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}

    >
      <Typography variant="h6">
        {entity?.title || "No title"}
      </Typography>
      <Typography>
        Map:
      </Typography>
      <iframe src={entity?.map || "NA"}> </iframe>

    </Popover>
  );
};

export default DepartmentPopover;
