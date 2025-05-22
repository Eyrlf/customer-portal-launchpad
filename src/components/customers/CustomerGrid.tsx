
// Since CustomerGrid.tsx is read-only, we need to create a custom styling component for it
// Let's create a new CSS file for customer grid styles

<lov-write file_path="src/components/customers/customerGrid.css">
/* Customer grid dark mode styles */
.dark .customer-grid-container {
  background-color: hsl(var(--background));
}

.dark .customer-card {
  background-color: hsl(var(--card));
  border-color: hsl(var(--border));
}

.dark .customer-name {
  color: hsl(var(--card-foreground));
}

.dark .customer-detail {
  color: hsl(var(--muted-foreground));
}
