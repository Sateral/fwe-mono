"use client";

import Link from "next/link";
import { IconPencil, IconTrash, IconDotsVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { deleteTag } from "@/lib/actions/meal.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AlertModal } from "@/components/modals/alert-modal";
import { useState } from "react";
import { DietaryTag } from "@/lib/generated/prisma/client";
import { Icon, icons, LucideProps } from "lucide-react";

import { darkenColor } from "@/lib/utils";

interface TagRowProps {
  tag: DietaryTag;
}

export function TagRow({ tag }: TagRowProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteTag(tag.id);
    if (result.success) {
      toast.success("Tag deleted successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete tag");
    }
    setLoading(false);
  };

  const DynamicLucideIcon = ({
    name,
    ...props
  }: { name: keyof typeof icons } & LucideProps) => {
    const Icon = icons[name];
    return Icon ? <Icon {...props} /> : null;
  };

  const darkerColor = tag.color ? darkenColor(tag.color, 40) : "#000000";

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        loading={loading}
      />
      <TableRow>
        <TableCell className="font-medium">{tag.name}</TableCell>
        <TableCell className="font-medium">
          <DynamicLucideIcon name={tag.icon as keyof typeof icons} />
        </TableCell>
        <TableCell className="font-medium">
          <div
            className={`h-4 w-4 rounded-full border`}
            style={{ backgroundColor: tag.color, borderColor: darkerColor }}
          />
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
                <Link href={`/dashboard/menu/tag/${tag.id}`}>
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
