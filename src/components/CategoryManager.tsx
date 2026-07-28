
import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CategoryLinkDialog } from './CategoryLinkDialog';
import { getCategoryColor } from '@/lib/categoryColors';

interface Category {
  value: string;
  label: string;
  icon: string;
  color: string;
}

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (category: Category) => void;
  onUpdateCategory: (oldValue: string, newCategory: Category) => void;
  onDeleteCategory: (categoryValue: string) => void;
}

export const CategoryManager = ({ 
  categories, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory 
}: CategoryManagerProps) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: '', icon: '', color: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ label: '', icon: '', color: '#6b7280' });
  const [linkDialog, setLinkDialog] = useState<{
    categoryValue: string;
    categoryLabel: string;
  } | null>(null);
  const { toast } = useToast();

  const handleEditStart = (category: Category) => {
    setEditingCategory(category.value);
    setEditForm({ label: category.label, icon: category.icon, color: category.color });
  };

  const handleEditSave = (categoryValue: string) => {
    if (!editForm.label.trim()) {
      toast({
        title: "Invalid Category",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    const newValue = editForm.label.toLowerCase().replace(/\s+/g, '-');
    onUpdateCategory(categoryValue, {
      value: newValue,
      label: editForm.label,
      icon: editForm.icon || '📝',
      color: editForm.color,
    });

    setEditingCategory(null);
    toast({
      title: "Category Updated",
      description: `${editForm.label} updated successfully`,
    });
  };

  const handleAdd = () => {
    if (!addForm.label.trim()) {
      toast({
        title: "Invalid Category",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    const categoryValue = addForm.label.toLowerCase().replace(/\s+/g, '-');
    onAddCategory({
      value: categoryValue,
      label: addForm.label,
      icon: addForm.icon || '📝',
      color: addForm.color,
    });

    setAddForm({ label: '', icon: '', color: '#6b7280' });
    setShowAddForm(false);
    toast({
      title: "Category Added",
      description: `${addForm.label} created successfully`,
    });
  };

  const handleDelete = (categoryValue: string, categoryLabel: string) => {
    onDeleteCategory(categoryValue);
    toast({
      title: "Category Deleted",
      description: `${categoryLabel} removed successfully`,
    });
  };

  const handleLinkCategory = (category: Category) => {
    setLinkDialog({
      categoryValue: category.value,
      categoryLabel: category.label
    });
  };

  return (
    <>
      <Card className="surface-elevated shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Manage Categories
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddForm && (
            <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
              <Input
                placeholder="Category name"
                value={addForm.label}
                onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Icon (emoji)"
                  value={addForm.icon}
                  onChange={(e) => setAddForm({ ...addForm, icon: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="color"
                  value={addForm.color}
                  onChange={(e) => setAddForm({ ...addForm, color: e.target.value })}
                  className="w-16"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {categories.map((category) => (
            <div key={category.value} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20">
              {editingCategory === category.value ? (
                <div className="flex-1 space-y-2">
                  <Input
                    value={editForm.label}
                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Icon"
                      value={editForm.icon}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      className="flex-1"
                    />
                    <Input
                      type="color"
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-16"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditSave(category.value)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: getCategoryColor(category.value) }}
                  />
                  <span className="text-lg">{category.icon}</span>
                  <span className="flex-1">{category.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLinkCategory(category)}
                    title="Link with user"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditStart(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.value, category.label)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {linkDialog && (
        <CategoryLinkDialog
          categoryValue={linkDialog.categoryValue}
          categoryLabel={linkDialog.categoryLabel}
          isOpen={true}
          onClose={() => setLinkDialog(null)}
        />
      )}
    </>
  );
};
