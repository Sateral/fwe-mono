"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconDotsVertical, IconPencil, IconTrash } from "@tabler/icons-react";
import { Meal } from "@fwe/db";
import { toast } from "sonner";

import { AlertModal } from "@/components/modals/alert-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { deleteMeal } from "@/lib/actions/meal.actions";

interface MealRowProps {
  meal: Meal;
}

export function MealRow({ meal }: MealRowProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteMeal(meal.id);
    if (result.success) {
      toast.success("Meal deleted successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete meal");
    }
    setLoading(false);
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        loading={loading}
      />
      <TableRow>
        <TableCell className="font-medium">{meal.name}</TableCell>
        <TableCell>{meal.slug}</TableCell>
        <TableCell>${meal.price.toFixed(2)}</TableCell>
        <TableCell>
          <Badge variant={meal.isActive ? "default" : "secondary"}>
            {meal.isActive ? "Active" : "Draft"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/menu/${meal.id}`}>
                  <IconPencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setOpen(true)}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    </>
  );
}
