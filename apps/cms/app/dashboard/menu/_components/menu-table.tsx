import React from "react";
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
import { getMeals } from "@/lib/actions/meal.actions";
import { MealRow } from "../_components/meal-row";
const MenuTable = async () => {
  const meals = await getMeals();

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Meals</CardTitle>
            <p className="text-sm text-muted-foreground">
              Active menu items and weekly specials.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/menu/new">
              <IconPlus className="mr-2 h-4 w-4" />
              Create Meal
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
                <TableHead>Slug</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No meals found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                meals.map((meal) => <MealRow meal={meal} key={meal.id} />)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuTable;
