async function fetchTable(supabaseUrl, supabaseKey, schema, table) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.main&select=data`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Accept-Profile': schema
    }
  });
  const rows = await res.json();
  return rows?.[0]?.data || [];
}

async function upsertRow(supabaseUrl, supabaseKey, schema, table, id, data) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Content-Profile': schema
    },
    body: JSON.stringify({ data })
  });
  return res.ok;
}

module.exports = { fetchTable, upsertRow };
