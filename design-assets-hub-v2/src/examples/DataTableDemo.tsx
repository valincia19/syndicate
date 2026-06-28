import { ColumnDef, DataTable } from "@/components/ui/data-table"

type Payment = {
  id: string
  status: "pending" | "processing" | "success" | "failed"
  email: string
  amount: number
}

const columns: ColumnDef<Payment>[] = [
  { accessorKey: "status", header: "Status" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      return <span className="font-medium tabular-nums">${amount.toFixed(2)}</span>
    }
  },
]

const data: Payment[] = [
  { id: "1", status: "success", email: "alice@example.com", amount: 250.0 },
  { id: "2", status: "processing", email: "bob@example.com", amount: 150.0 },
  { id: "3", status: "success", email: "charlie@example.com", amount: 350.0 },
  { id: "4", status: "pending", email: "diana@example.com", amount: 200.0 },
  { id: "5", status: "failed", email: "eve@example.com", amount: 100.0 },
  { id: "6", status: "success", email: "frank@example.com", amount: 450.0 },
  { id: "7", status: "processing", email: "grace@example.com", amount: 300.0 },
  { id: "8", status: "success", email: "henry@example.com", amount: 175.0 },
  { id: "9", status: "pending", email: "iris@example.com", amount: 225.0 },
  { id: "10", status: "success", email: "jack@example.com", amount: 500.0 },
  { id: "11", status: "failed", email: "kevin@example.com", amount: 125.0 },
  { id: "12", status: "processing", email: "lisa@example.com", amount: 275.0 },
]

export function DataTableDemo() {
  return <DataTable columns={columns} data={data} filterColumn="email" filterPlaceholder="Filter by email..." pageSize={5} />
}
