import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Upload, Save, X, Eye, EyeOff } from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
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
  optionGroupLabel?: string;
  choiceOptions?: Array<{
    label: string;
    price: number;
    available?: boolean;
  }>;
  drinkSizes?: Array<{
    size: string;
    price: number;
  }>;
}

const defaultChoiceOption = { label: '', price: 0 };
const presetSizes = ['Pequeño', 'Mediano', 'Grande', '12 oz', '16 oz', '24 oz'];
const presetFlavors = ['Pollo', 'Cerdo', 'Res', 'Queso', 'Jamón', 'Mixta'];

const MenuManager: React.FC = () => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const savingRef = useRef(false);
  const businessIdRef = useRef<string | null>(null);
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
    optionGroupLabel: 'Sabor',
    choiceOptions: [],
    drinkSizes: []
  });

  const categories = ['Platos Típicos', 'Pizzas', 'Hamburguesas', 'Sándwich', 'Bebidas', 'Postres', 'Ensaladas', 'Sopas'];
  const isDrinkCategory = (category?: string) => (category || '').toLowerCase().includes('bebida');
  const sanitizeChoiceOptions = (choiceOptions?: Array<{ label: string; price: number; available?: boolean }>) =>
    (choiceOptions || [])
      .filter((option) => option.label.trim() && Number.isFinite(option.price) && option.price > 0)
      .map((option) => ({ label: option.label.trim(), price: option.price, available: option.available !== false }));
  // Cargar menú del negocio actual desde Firebase
  useEffect(() => {
    const loadMenu = async () => {
      if (savingRef.current) return;
      if (user?.role === 'business') {
        try {
          const businesses = await FirebaseServiceV2.getBusinesses();
          if (savingRef.current) return;
          const business = businesses.find(b => b.email === user.email);
          if (business) {
            businessIdRef.current = business.id; // Guardar ID para saves futuros
            if (business.menu) {
              const convertedMenu: MenuItem[] = business.menu.map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description || '',
                price: item.price,
                category: item.category || 'General',
                image: item.image || 'https://picsum.photos/seed/default/300/200',
                isActive: item.available !== false,
                isAvailable: item.available !== false,
                optionGroupLabel: String(item.optionGroupLabel || (isDrinkCategory(item.category) ? 'Tamaño' : 'Sabor')),
                choiceOptions: (item.choiceOptions || item.drinkSizes || []).map((option: any) => ({
                  label: String(option?.label || option?.size || '').trim(),
                  price: Number(option?.price) || 0,
                  available: option?.available !== false,
                })),
                drinkSizes: item.drinkSizes || []
              }));
              setMenuItems(convertedMenu);
            }
          }
        } catch (error) {
          console.error('❌ [MenuManager] Error cargando menú:', error);
        }
      }
    };

    loadMenu();
    const interval = setInterval(loadMenu, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Guardar menú directo a Firestore (sin pasar por service layer)
  const saveMenuToFirebase = async (updatedMenu: MenuItem[]) => {
    if (!user || user.role !== 'business') return;

    savingRef.current = true;
    setSaveStatus('saving');
    setSaveError('');

    try {
      // Si no tenemos el businessId, buscarlo
      if (!businessIdRef.current) {
        const businesses = await FirebaseServiceV2.getBusinesses();
        const business = businesses.find(b => b.email === user.email);
        if (business) {
          businessIdRef.current = business.id;
        } else {
          throw new Error('No se encontró tu negocio (email: ' + user.email + ')');
        }
      }

      // Construir menú limpio con SOLO strings, numbers y booleans
      const cleanMenu: any[] = [];
      for (let i = 0; i < updatedMenu.length; i++) {
        const item = updatedMenu[i];
        const plain: any = {};
        plain.id = '' + (item.id || Date.now());
        plain.name = '' + (item.name || '');
        plain.description = '' + (item.description || '');
        plain.price = +(item.price) || 0;
        plain.category = '' + (item.category || '');
        plain.image = '' + (item.image || '');
        plain.available = !!(item.isAvailable !== false && item.isActive !== false);
        const choiceOptions = sanitizeChoiceOptions(item.choiceOptions);
        plain.optionGroupLabel = String(item.optionGroupLabel || (isDrinkCategory(item.category) ? 'Tamaño' : 'Sabor'));
        plain.choiceOptions = choiceOptions.map((opt) => ({ label: opt.label, price: opt.price, available: opt.available }));
        plain.drinkSizes = choiceOptions.map((option) => ({
          size: option.label,
          price: option.price,
          available: option.available,
        }));
        cleanMenu.push(plain);
      }

      const businessRef = doc(db, 'businesses', businessIdRef.current);

      // Paso 1: Verificar que Firestore funciona con datos simples
      try {
        await updateDoc(businessRef, { _menuTest: 'v8-' + Date.now() });
      } catch (testErr: any) {
        throw new Error('PASO1_FALLO: No se puede escribir a Firestore: ' + (testErr?.message || testErr));
      }

      // Paso 2: Escribir el menú limpio
      try {
        await updateDoc(businessRef, { menu: cleanMenu });
      } catch (menuErr: any) {
        // Si falla, intentar con JSON roundtrip
        try {
          const jsonClean = JSON.parse(JSON.stringify(cleanMenu));
          await updateDoc(businessRef, { menu: jsonClean });
        } catch (menuErr2: any) {
          throw new Error('PASO2_FALLO: ' + (menuErr?.message || menuErr) + ' | JSON: ' + (menuErr2?.message || menuErr2));
        }
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (error: any) {
      const msg = error?.message || error?.code || String(error);
      console.error('❌ [MenuManager] Error guardando:', msg);
      setSaveError(msg);
      setSaveStatus('error');
      alert('Error v8: ' + msg);
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      savingRef.current = false;
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
      const normalizedChoiceOptions = sanitizeChoiceOptions(newItem.choiceOptions);
      const item: MenuItem = {
        id: Date.now().toString(),
        name: newItem.name,
        description: newItem.description || '',
        price: newItem.price,
        category: newItem.category,
        image: newItem.image || 'https://picsum.photos/seed/default/300/200',
        isActive: newItem.isActive || true,
        isAvailable: newItem.isAvailable || true,
        optionGroupLabel: String(newItem.optionGroupLabel || (isDrinkCategory(newItem.category) ? 'Tamaño' : 'Sabor')),
        choiceOptions: normalizedChoiceOptions,
        drinkSizes: normalizedChoiceOptions.map((option) => ({ size: option.label, price: option.price }))
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
        optionGroupLabel: 'Sabor',
        choiceOptions: [],
        drinkSizes: []
      });
      setIsAddingNew(false);
    }
  };

  const addChoiceOptionToNew = () => {
    setNewItem((prev) => ({ ...prev, choiceOptions: [...(prev.choiceOptions || []), { ...defaultChoiceOption }] }));
  };

  const updateChoiceOptionOnNew = (index: number, patch: Partial<{ label: string; price: number; available: boolean }>) => {
    setNewItem((prev) => ({
      ...prev,
      choiceOptions: (prev.choiceOptions || []).map((option, idx) => (idx === index ? { ...option, ...patch } : option)),
    }));
  };

  const removeChoiceOptionOnNew = (index: number) => {
    setNewItem((prev) => ({ ...prev, choiceOptions: (prev.choiceOptions || []).filter((_, idx) => idx !== index) }));
  };

  const addChoiceOptionToEdit = () => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, choiceOptions: [...(editingItem.choiceOptions || []), { ...defaultChoiceOption }] });
  };

  const updateChoiceOptionOnEdit = (index: number, patch: Partial<{ label: string; price: number; available: boolean }>) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      choiceOptions: (editingItem.choiceOptions || []).map((option, idx) => (idx === index ? { ...option, ...patch } : option)),
    });
  };

  const removeChoiceOptionOnEdit = (index: number) => {
    if (!editingItem) return;
    setEditingItem({ ...editingItem, choiceOptions: (editingItem.choiceOptions || []).filter((_, idx) => idx !== index) });
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
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-black font-display text-gray-900">Gestión de Menú</h2>
          {saveStatus === 'saving' && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full animate-pulse">Guardando...</span>}
          {saveStatus === 'saved' && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">✓ Guardado</span>}
          {saveStatus === 'error' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">✗ {saveError || 'Error al guardar'}</span>}
        </div>
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
                  onChange={(e) => setNewItem({
                    ...newItem,
                    category: e.target.value,
                    optionGroupLabel: isDrinkCategory(e.target.value) ? 'Tamaño' : 'Sabor'
                  })}
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

            <div className="space-y-3 bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-700 uppercase tracking-widest">Opciones del producto</label>
                  <button
                    type="button"
                    onClick={addChoiceOptionToNew}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    + Agregar opción
                  </button>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nombre del grupo</label>
                  <input
                    type="text"
                    value={newItem.optionGroupLabel || ''}
                    onChange={(e) => setNewItem({ ...newItem, optionGroupLabel: e.target.value })}
                    className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm bg-white"
                    placeholder="Ej: Sabor, Tamaño"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(isDrinkCategory(newItem.category) ? presetSizes : presetFlavors)
                    .filter((preset) => !(newItem.choiceOptions || []).some((option) => option.label.toLowerCase() === preset.toLowerCase()))
                    .map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewItem(prev => ({ ...prev, choiceOptions: [...(prev.choiceOptions || []), { label: preset, price: prev.price || 0 }] }))}
                      className="text-xs px-3 py-1.5 rounded-full border border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-100 transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                {(newItem.choiceOptions || []).map((option, idx) => (
                  <div key={`new-size-${idx}`} className="grid grid-cols-[1fr_100px_auto_auto] gap-2 items-center">
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateChoiceOptionOnNew(idx, { label: e.target.value })}
                      className={`p-2 border border-gray-200 rounded-lg text-sm bg-white ${option.available === false ? 'opacity-50 line-through' : ''}`}
                      placeholder="Ej: Pollo, Res, Grande"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">RD$</span>
                      <input
                        type="number"
                        min={0}
                        value={option.price || ''}
                        onChange={(e) => updateChoiceOptionOnNew(idx, { price: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        placeholder="0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => updateChoiceOptionOnNew(idx, { available: option.available === false ? true : false })}
                      className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-colors whitespace-nowrap ${option.available !== false ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    >
                      {option.available !== false ? 'Disp.' : 'Agotado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeChoiceOptionOnNew(idx)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(newItem.choiceOptions || []).length === 0 && (
                  <p className="text-xs text-blue-400 italic">Agrega opciones como sabores o tamaños para que el cliente elija 1.</p>
                )}
              </div>

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
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        category: e.target.value,
                        optionGroupLabel: editingItem.optionGroupLabel || (isDrinkCategory(e.target.value) ? 'Tamaño' : 'Sabor')
                      })}
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

                  <div className="space-y-2 bg-blue-50/60 border border-blue-200 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-blue-700 uppercase">Opciones</p>
                        <button type="button" onClick={addChoiceOptionToEdit} className="text-xs font-bold text-primary hover:underline">+ Opción</button>
                      </div>
                      <input
                        type="text"
                        value={editingItem.optionGroupLabel || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, optionGroupLabel: e.target.value })}
                        className="p-2 border border-gray-200 rounded-lg text-sm bg-white"
                        placeholder="Nombre del grupo: Sabor o Tamaño"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {(isDrinkCategory(editingItem.category) ? presetSizes : presetFlavors)
                          .filter((preset) => !(editingItem.choiceOptions || []).some((option) => option.label.toLowerCase() === preset.toLowerCase()))
                          .map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setEditingItem({ ...editingItem, choiceOptions: [...(editingItem.choiceOptions || []), { label: preset, price: editingItem.price || 0 }] })}
                            className="text-[11px] px-2 py-1 rounded-full border border-dashed border-blue-300 text-blue-600 font-semibold hover:bg-blue-100 transition-colors"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                      {(editingItem.choiceOptions || []).map((option, idx) => (
                        <div key={`edit-size-${idx}`} className="grid grid-cols-[1fr_90px_auto_auto] gap-2 items-center">
                          <input
                            type="text"
                            value={option.label}
                            onChange={(e) => updateChoiceOptionOnEdit(idx, { label: e.target.value })}
                            className={`p-2 border border-gray-200 rounded-lg text-sm bg-white ${option.available === false ? 'opacity-50 line-through' : ''}`}
                            placeholder="Ej: Cerdo"
                          />
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">RD$</span>
                            <input
                              type="number"
                              min={0}
                              value={option.price || ''}
                              onChange={(e) => updateChoiceOptionOnEdit(idx, { price: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-9 pr-2 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              placeholder="0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => updateChoiceOptionOnEdit(idx, { available: option.available === false ? true : false })}
                            className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-colors whitespace-nowrap ${option.available !== false ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                          >
                            {option.available !== false ? 'Disp.' : 'Agotado'}
                          </button>
                          <button type="button" onClick={() => removeChoiceOptionOnEdit(idx)} className="px-2 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
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
                    {(item.choiceOptions || []).length > 0 && (
                      <p className="text-[11px] text-gray-400 mb-3">
                        {item.optionGroupLabel || 'Opciones'}: {(item.choiceOptions || []).map((option) => `${option.label.toUpperCase()} RD$${option.price}`).join(' · ')}
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
