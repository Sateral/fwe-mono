import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTags } from "@/lib/actions/meal.actions";
import { TagRow } from "./tag-row";
const TagTable = async () => {
  const tags = await getTags();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold tracking-tight">Tag Management</h1>
        <Button asChild>
          <Link href="/dashboard/menu/tag/new">
            <IconPlus className="mr-2 h-4 w-4" />
            Create Tag
          </Link>
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  No tags found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => <TagRow tag={tag} key={tag.id} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TagTable;
