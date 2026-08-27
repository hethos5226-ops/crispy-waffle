import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      heading="Product not found"
      message="That product isn't in the BuyWise MVP catalog yet. Try one of these instead:"
    />
  );
}
