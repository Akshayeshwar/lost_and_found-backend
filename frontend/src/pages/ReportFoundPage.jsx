import React from 'react';
import ItemForm from '../components/ItemForm';

export default function ReportFoundPage({ onAddItem }) {
  return (
    <div>
      <ItemForm
        initialType="FOUND"
        titleText="Report a Found Item"
        subtitleText="Help a fellow student or staff member by logging an item you discovered on campus."
        onSubmit={onAddItem}
      />
    </div>
  );
}
