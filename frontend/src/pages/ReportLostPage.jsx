import React from 'react';
import ItemForm from '../components/ItemForm';

export default function ReportLostPage({ onAddItem }) {
  return (
    <div>
      <ItemForm
        initialType="LOST"
        titleText="Report a Lost Item"
        subtitleText="Describe the item you misplaced so that finders or campus security can return it."
        onSubmit={onAddItem}
      />
    </div>
  );
}
