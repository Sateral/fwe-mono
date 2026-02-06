import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Dietary Tags</CardTitle>
            <p className="text-sm text-muted-foreground">
              Badges used for menu filtering and meal metadata.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/menu/tag/new">
              <IconPlus className="mr-2 h-4 w-4" />
              Create Tag
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
                  <TableCell colSpan={4} className="h-24 text-center">
                    No tags found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((tag) => <TagRow tag={tag} key={tag.id} />)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TagTable;
