import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Upload, Save, X, Eye, EyeOff } from 'lucide-react';
import FirebaseServiceV2 from '../services/FirebaseServiceV2';
import { useAuth } from '../contexts/AuthContext';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isActive: boolean;
  isAvailable: boolean;
  drinkSizes?: Array<{
    size: string;
    price: number;
  }>;
}

const defaultDrinkSize = { size: '', price: 0 };
const presetSizes = ['Pequeño', 'Mediano', 'Grande', '12 oz', '16 oz', '24 oz'];

const MenuManager: React.FC = () => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    image: '',
    isActive: true,
    isAvailable: true,
    drinkSizes: []
  });

  const categories = ['Platos Típicos', 'Pizzas', 'Bebidas', 'Postres', 'Ensaladas', 'Sopas'];
  const isDrinkCategory = (category?: string) => (category || '').toLowerCase().includes('bebida');
  const sanitizeDrinkSizes = (drinkSizes?: Array<{ size: string; price: number }>) =>
    (drinkSizes || [])
      .filter((size) => size.size.trim() && Number.isFinite(size.price) && size.price > 0)
      .map((size) => ({ size: size.size.trim().toLowerCase(), price: size.price }));

  // Cargar menú del negocio actual desde Firebase
  useEffect(() => {
    const loadMenu = async () => {
      if (user?.role === 'business') {
        try {
          console.log('🔍 [MenuManager] Cargando menú desde Firebase...');
          const businesses = await FirebaseServiceV2.getBusinesses();
          const business = businesses.find(b => b.email === user.email);
          if (business && business.menu) {
            const convertedMenu: MenuItem[] = business.menu.map((item: any) => ({
              id: item.id,
              name: item.name,
              description: item.description || '',
              price: item.price,
              category: item.category || 'General',
              image: item.image || 'https://picsum.photos/seed/default/300/200',
              isActive: item.available !== false,
              isAvailable: item.available !== false,
              drinkSizes: item.drinkSizes || []
            }));
            setMenuItems(convertedMenu);
            console.log(`✅ [MenuManager] ${convertedMenu.length} items cargados`);
          }
        } catch (error) {
          console.error('❌ [MenuManager] Error cargando menú:', error);
        }
      }
    };

    loadMenu();
    
    // Recargar cada 30 segundos
    const interval = setInterval(loadMenu, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Guardar menú en Firebase
  const saveMenuToFirebase = async (updatedMenu: MenuItem[]) => {
    if (user?.role === 'business') {
      try {
        console.log('💾 [MenuManager] Guardando menú en Firebase...');
        const businesses = await FirebaseServiceV2.getBusinesses();
        const businessIndex = businesses.findIndex(b => b.email === user.email);
        
        if (businessIndex !== -1) {
          const business = businesses[businessIndex];
          // Convertir al formato del DataService/Firebase
          const convertedMenu = updatedMenu.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            image: item.image,
            available: item.isAvailable && item.isActive,
            drinkSizes: isDrinkCategory(item.category) ? sanitizeDrinkSizes(item.drinkSizes) : []
          }));
          
          // Actualizar el negocio con el nuevo menú
          await FirebaseServiceV2.updateBusiness(business.id, {
            ...business,
            menu: convertedMenu
          });
          console.log('✅ [MenuManager] Menú guardado en Firebase');
        }
      } catch (error) {
        console.error('❌ [MenuManager] Error guardando menú:', error);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, item?: MenuItem) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        if (item) {
          setEditingItem({ ...item, image: imageUrl });
        } else {
          setNewItem({ ...newItem, image: imageUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = () => {
    if (editingItem) {
      const updatedMenu = menuItems.map(item => 
        item.id === editingItem.id ? editingItem : item
      );
      setMenuItems(updatedMenu);
      saveMenuToFirebase(updatedMenu);
      setEditingItem(null);
    }
  };

  const handleAddNew = () => {
    if (newItem.name && newItem.price && newItem.category) {
      const item: MenuItem = {
        id: Date.now().toString(),
        name: newItem.name,
        description: newItem.description || '',
        price: newItem.price,
        category: newItem.category,
        image: newItem.image || 'https://picsum.photos/seed/default/300/200',
        isActive: newItem.isActive || true,
        isAvailable: newItem.isAvailable || true,
        drinkSizes: isDrinkCategory(newItem.category) ? sanitizeDrinkSizes(newItem.drinkSizes) : []
      };
      const updatedMenu = [...menuItems, item];
      setMenuItems(updatedMenu);
      saveMenuToFirebase(updatedMenu);
      setNewItem({
        name: '',
        description: '',
        price: 0,
        category: '',
        image: '',
        isActive: true,
        isAvailable: true,
        drinkSizes: []
      });
      setIsAddingNew(false);
    }
  };

  const addDrinkSizeToNew = () => {
    setNewItem((prev) => ({ ...prev, drinkSizes: [...(prev.drinkSizes || []), { ...defaultDrinkSize }] }));
  };

  const updateDrinkSizeOnNew = (index: number, patch: Partial<{ size: string; price: number }>) => {
    setNewItem((prev) => ({
      ...prev,
      drinkSizes: (prev.drinkSizes || []).map((size, idx) => (idx === index ? { ...size, ...patch } : size)),
    }));
  };

  const removeDrinkSizeOnNew = (index: number) => {
    setNewItem((prev) => ({ ...prev, drinkSizes: (prev.drinkSizes || []).filter((_, idx) => idx !== index) }));
  };

  const addDrinkSizeToEdit = () => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, drinkSizes: [...(editingItem.drinkSizes || []), { ...defaultDrinkSize }] });
  };

  const updateDrinkSizeOnEdit = (index: number, patch: Partial<{ size: string; price: number }>) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      drinkSizes: (editingItem.drinkSizes || []).map((size, idx) => (idx === index ? { ...size, ...patch } : size)),
    });
  };

  const removeDrinkSizeOnEdit = (index: number) => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, drinkSizes: (editingItem.drinkSizes || []).filter((_, idx) => idx !== index) });
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      const updatedMenu = menuItems.filter(item => item.id !== id);
      setMenuItems(updatedMenu);
      saveMenuToFirebase(updatedMenu);
    }
  };

  const toggleActive = (id: string) => {
    const updatedMenu = menuItems.map(item => 
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    setMenuItems(updatedMenu);
    saveMenuToFirebase(updatedMenu);
  };

  const toggleAvailable = (id: string) => {
    const updatedMenu = menuItems.map(item => 
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    );
    setMenuItems(updatedMenu);
    saveMenuToFirebase(updatedMenu);
  };

  const activeItems = menuItems.filter(item => item.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black font-display text-gray-900">Gestión de Menú</h2>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          AGREGAR PRODUCTO
        </button>
      </div>

      {/* Formulario para agregar nuevo producto */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Nuevo Producto</h3>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                  placeholder="Nombre del producto"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Precio</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">RD$</span>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-12 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoría</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value, drinkSizes: isDrinkCategory(e.target.value) ? (newItem.drinkSizes || []) : [] })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Imagen</label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {newItem.image ? 'Cambiar imagen' : 'Subir imagen'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {isDrinkCategory(newItem.category) && (
              <div className="space-y-3 bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-widest">🥤 Tamaños de bebida</label>
                  <button
                    type="button"
                    onClick={addDrinkSizeToNew}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    + Agregar tamaño personalizado
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {presetSizes.filter(ps => !(newItem.drinkSizes || []).some(ds => ds.size.toLowerCase() === ps.toLowerCase())).map(ps => (
                    <button
                      key={ps}
                      type="button"
                      onClick={() => setNewItem(prev => ({ ...prev, drinkSizes: [...(prev.drinkSizes || []), { size: ps, price: 0 }] }))}
                      className="text-xs px-3 py-1.5 rounded-full border border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-100 transition-colors"
                    >
                      + {ps}
                    </button>
                  ))}
                </div>
                {(newItem.drinkSizes || []).map((size, idx) => (
                  <div key={`new-size-${idx}`} className="grid grid-cols-[1fr_130px_auto] gap-2 items-center">
                    <input
                      type="text"
                      value={size.size}
                      onChange={(e) => updateDrinkSizeOnNew(idx, { size: e.target.value })}
                      className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                      placeholder="Ej: Grande, 16 oz"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">RD$</span>
                      <input
                        type="number"
                        min={0}
                        value={size.price || ''}
                        onChange={(e) => updateDrinkSizeOnNew(idx, { price: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        placeholder="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDrinkSizeOnNew(idx)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(newItem.drinkSizes || []).length === 0 && (
                  <p className="text-xs text-blue-400 italic">Agrega al menos un tamaño con su precio para que el cliente pueda elegir.</p>
                )}
              </div>
            )}

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descripción</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-primary/20"
                  rows={2}
                  placeholder="Descripción del producto"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddNew}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
                >
                  <Save className="w-4 h-4" />
                  GUARDAR PRODUCTO
                </button>
                <button
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                >
                  CANCELAR
                </button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de productos */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-400">
            {activeItems.length} productos activos
          </span>
          <span className="text-sm font-bold text-gray-400">
            {menuItems.filter(item => item.isAvailable).length} disponibles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden group ${
                item.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              {editingItem?.id === item.id ? (
                // Modo edición
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={editingItem.name}
                      onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="font-bold text-lg bg-transparent border-b border-primary focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={editingItem.price}
                      onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                      className="p-2 border border-gray-200 rounded-lg text-sm"
                      placeholder="Precio"
                    />
                    <select
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value, drinkSizes: isDrinkCategory(e.target.value) ? (editingItem.drinkSizes || []) : [] })}
                      className="p-2 border border-gray-200 rounded-lg text-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none"
                    rows={2}
                  />

                  {isDrinkCategory(editingItem.category) && (
                    <div className="space-y-2 bg-blue-50/60 border border-blue-200 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-blue-700 uppercase">🥤 Tamaños</p>
                        <button type="button" onClick={addDrinkSizeToEdit} className="text-xs font-bold text-primary hover:underline">+ Personalizado</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {presetSizes.filter(ps => !(editingItem.drinkSizes || []).some(ds => ds.size.toLowerCase() === ps.toLowerCase())).map(ps => (
                          <button
                            key={ps}
                            type="button"
                            onClick={() => setEditingItem({ ...editingItem, drinkSizes: [...(editingItem.drinkSizes || []), { size: ps, price: 0 }] })}
                            className="text-[11px] px-2 py-1 rounded-full border border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-100 transition-colors"
                          >
                            + {ps}
                          </button>
                        ))}
                      </div>
                      {(editingItem.drinkSizes || []).map((size, idx) => (
                        <div key={`edit-size-${idx}`} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                          <input
                            type="text"
                            value={size.size}
                            onChange={(e) => updateDrinkSizeOnEdit(idx, { size: e.target.value })}
                            className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                            placeholder="Ej: Grande"
                          />
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">RD$</span>
                            <input
                              type="number"
                              min={0}
                              value={size.price || ''}
                              onChange={(e) => updateDrinkSizeOnEdit(idx, { price: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              placeholder="0"
                            />
                          </div>
                          <button type="button" onClick={() => removeDrinkSizeOnEdit(idx)} className="px-2 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Modo vista
                <>
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">NO DISPONIBLE</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => toggleActive(item.id)}
                        className={`p-1.5 rounded-lg backdrop-blur-sm ${
                          item.isActive ? 'bg-emerald-500/90 text-white' : 'bg-gray-500/90 text-white'
                        }`}
                      >
                        {item.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
                      >
                        <Edit2 className="w-3 h-3 text-gray-700" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 bg-red-500/90 backdrop-blur-sm rounded-lg hover:bg-red-600/90 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                      <span className="font-bold text-primary text-sm">RD$ {item.price}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                    {isDrinkCategory(item.category) && (item.drinkSizes || []).length > 0 && (
                      <p className="text-[11px] text-gray-400 mb-3">
                        Tamaños: {(item.drinkSizes || []).map((size) => `${size.size.toUpperCase()} RD$${size.price}`).join(' · ')}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                        {item.category}
                      </span>
                      <button
                        onClick={() => toggleAvailable(item.id)}
                        className={`text-xs px-2 py-1 rounded-lg font-bold transition-colors ${
                          item.isAvailable 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {item.isAvailable ? 'DISPONIBLE' : 'AGOTADO'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuManager;
