import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ADMIN_HIDDEN_TABS_STORAGE_KEY,
  ADMIN_TAB_LABELS,
  ADMIN_TAB_ORDER_STORAGE_KEY,
  ALWAYS_VISIBLE_ADMIN_TAB,
  AdminTabId,
  DEFAULT_ADMIN_TAB_ORDER,
} from "@/lib/adminTabs";

interface AdminSettingsProps {
  tabOrder: AdminTabId[];
  onTabOrderChange: (order: AdminTabId[]) => void;
  hiddenTabs: AdminTabId[];
  onHiddenTabsChange: (hidden: AdminTabId[]) => void;
}

export function AdminSettings({ tabOrder, onTabOrderChange, hiddenTabs, onHiddenTabsChange }: AdminSettingsProps) {
  const [draggedTab, setDraggedTab] = useState<AdminTabId | null>(null);
  const [dragOverTab, setDragOverTab] = useState<AdminTabId | null>(null);

  const saveOrder = (order: AdminTabId[]) => {
    onTabOrderChange(order);
    localStorage.setItem(ADMIN_TAB_ORDER_STORAGE_KEY, JSON.stringify(order));
  };

  const moveTab = (tab: AdminTabId, targetIndex: number) => {
    const currentIndex = tabOrder.indexOf(tab);
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= tabOrder.length || currentIndex === targetIndex) return;

    const nextOrder = [...tabOrder];
    nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, tab);
    saveOrder(nextOrder);
  };

  const dropTab = (targetTab: AdminTabId) => {
    if (draggedTab && draggedTab !== targetTab) moveTab(draggedTab, tabOrder.indexOf(targetTab));
    setDraggedTab(null);
    setDragOverTab(null);
  };

  const resetOrder = () => saveOrder([...DEFAULT_ADMIN_TAB_ORDER]);

  const saveHidden = (hidden: AdminTabId[]) => {
    onHiddenTabsChange(hidden);
    localStorage.setItem(ADMIN_HIDDEN_TABS_STORAGE_KEY, JSON.stringify(hidden));
  };

  const toggleHidden = (tab: AdminTabId) => {
    saveHidden(hiddenTabs.includes(tab) ? hiddenTabs.filter((t) => t !== tab) : [...hiddenTabs, tab]);
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Ordre des onglets</CardTitle>
          <CardDescription>Faites glisser les lignes pour choisir leur ordre dans le menu d’administration.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={resetOrder}>
          <RotateCcw className="h-4 w-4" />
          Ordre initial
        </Button>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="mx-auto max-w-2xl space-y-2">
            {tabOrder.map((tab, index) => (
              <div
                key={tab}
                draggable
                onDragStart={() => setDraggedTab(tab)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverTab(tab);
                }}
                onDragLeave={() => setDragOverTab((current) => current === tab ? null : current)}
                onDrop={(event) => {
                  event.preventDefault();
                  dropTab(tab);
                }}
                onDragEnd={() => {
                  setDraggedTab(null);
                  setDragOverTab(null);
                }}
                className={`flex min-h-14 items-center gap-3 rounded-md border bg-background px-3 transition-colors ${
                  dragOverTab === tab && draggedTab !== tab ? "border-brand bg-accent" : ""
                } ${draggedTab === tab ? "opacity-50" : ""}`}
              >
                <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" aria-hidden="true" />
                <span className="w-7 text-center text-sm tabular-nums text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 flex-1 font-medium">{ADMIN_TAB_LABELS[tab]}</span>
                <div className="flex shrink-0 gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => moveTab(tab, index - 1)}
                        aria-label={`Monter ${ADMIN_TAB_LABELS[tab]}`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Monter</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === tabOrder.length - 1}
                        onClick={() => moveTab(tab, index + 1)}
                        aria-label={`Descendre ${ADMIN_TAB_LABELS[tab]}`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Descendre</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Visibilité des onglets</CardTitle>
          <CardDescription>Masquez les onglets que vous n’utilisez pas. L’onglet Utilitaires reste toujours visible.</CardDescription>
        </div>
        {hiddenTabs.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => saveHidden([])}>
            <RotateCcw className="h-4 w-4" />
            Tout afficher
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="mx-auto max-w-2xl space-y-2">
          {tabOrder.map((tab) => {
            const hidden = hiddenTabs.includes(tab);
            const locked = tab === ALWAYS_VISIBLE_ADMIN_TAB;
            return (
              <div
                key={tab}
                className={`flex min-h-14 items-center gap-3 rounded-md border bg-background px-3 ${hidden ? "opacity-60" : ""}`}
              >
                {hidden ? (
                  <EyeOff className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <Eye className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 font-medium">{ADMIN_TAB_LABELS[tab]}</span>
                <Button
                  variant={hidden ? "default" : "outline"}
                  size="sm"
                  disabled={locked}
                  onClick={() => toggleHidden(tab)}
                >
                  {locked ? "Toujours visible" : hidden ? "Afficher" : "Masquer"}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}