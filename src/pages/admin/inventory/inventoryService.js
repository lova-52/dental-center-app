// src/pages/admin/inventory/inventoryService.js
import { supabase } from '../../../lib/supabase';

/** ITEMS */
export const fetchItems = async (q = '') => {
  const query = supabase.from('items').select('*').order('created_at', { ascending: false });
  if (q) return query.ilike('name', `%${q}%`);
  return query;
};

export const createItem = (payload) =>
  supabase.from('items').insert([payload]);

export const updateItem = (id, payload) =>
  supabase.from('items').update(payload).eq('id', id);

export const deleteItem = (id) =>
  supabase.from('items').delete().eq('id', id);

/** CATEGORIES */
export const fetchCategories = () =>
  supabase.from('categories').select('*').order('name');

export const createCategory = (payload) =>
  supabase.from('categories').insert([payload]);

export const updateCategory = (id, payload) =>
  supabase.from('categories').update(payload).eq('id', id);

export const deleteCategory = (id) =>
  supabase.from('categories').delete().eq('id', id);

/** SUPPLIERS */
export const fetchSuppliers = () =>
  supabase.from('suppliers').select('*').order('created_at', { ascending: false });

export const createSupplier = (payload) =>
  supabase.from('suppliers').insert([payload]);

export const updateSupplier = (id, payload) =>
  supabase.from('suppliers').update(payload).eq('id', id);

export const deleteSupplier = (id) =>
  supabase.from('suppliers').delete().eq('id', id);

/** STOCK MOVEMENTS */
export const fetchStockMovements = async (type = null) => {
  const q = supabase
    .from('stock_movements')
    .select('*, movement_items(*), profiles(full_name), suppliers(name)')
    .order('movement_date', { ascending: false });

  if (type) return q.eq('movement_type', type);
  return q;
};

export const createStockMovement = async (movement, items = []) => {
  // Insert movement
  const { data: mdata, error: merr } = await supabase
    .from('stock_movements')
    .insert([movement])
    .select()
    .single();
  if (merr) throw merr;
  const movementId = mdata.id;

  // Insert items
  const itemsToInsert = items.map(it => ({ ...it, movement_id: movementId }));
  const { error: ierr } = await supabase.from('movement_items').insert(itemsToInsert);
  if (ierr) throw ierr;

  // Update qty_on_hand via RPC if exists, else do client-side
  for (const it of items) {

    if (movement.movement_type === 'in') {
  
      const { error } = await supabase.rpc('increase_item_qty', {
        p_item_id: it.item_id,
        p_delta: Number(it.qty)
      });
  
      if (error) {
        const { data: cur } = await supabase
          .from('items')
          .select('qty_on_hand')
          .eq('id', it.item_id)
          .single();
  
        const newQty = (cur?.qty_on_hand || 0) + Number(it.qty || 0);
  
        await supabase
          .from('items')
          .update({ qty_on_hand: newQty })
          .eq('id', it.item_id);
      }
  
    } else {
  
      const { error } = await supabase.rpc('decrease_item_qty', {
        p_item_id: it.item_id,
        p_delta: Number(it.qty)
      });
  
      if (error) {
        const { data: cur } = await supabase
          .from('items')
          .select('qty_on_hand')
          .eq('id', it.item_id)
          .single();
  
        const newQty = (cur?.qty_on_hand || 0) - Number(it.qty || 0);
  
        await supabase
          .from('items')
          .update({ qty_on_hand: newQty })
          .eq('id', it.item_id);
      }
  
    }
  }

  return mdata;
};

export const updateStockMovement = async (id, movement, items = []) => {
  // Basic update (not handling adjusting qty_on_hand deltas)
  const { error } = await supabase.from('stock_movements').update(movement).eq('id', id);
  if (error) throw error;
  // Implement item updates if needed
  return true;
};

export const deleteStockMovement = async (id) => {
  const { error } = await supabase.from('stock_movements').delete().eq('id', id);
  if (error) throw error;
  return true;
};

/** Storage helper for item images */
export const uploadItemImage = async (file, itemId) => {
  const ext = file.name.split('.').pop();
  const filename = `${itemId || Date.now()}_${Date.now()}.${ext}`;
  const path = `items/${filename}`;
  const { error } = await supabase.storage.from('items').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('items').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
};

export const getPublicUrl = (path) => {
  if (!path) return null;
  const { data } = supabase.storage.from('items').getPublicUrl(path);
  return data?.publicUrl || null;
};