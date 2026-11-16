DROP TRIGGER IF EXISTS trg_load_overview_after_codigo_insert;

CREATE TRIGGER trg_load_overview_after_codigo_insert
AFTER INSERT ON codigos
BEGIN
  INSERT INTO load_overviews (id, codigo_id, request_number)
  VALUES (
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
      substr(lower(hex(randomblob(2))), 2) || '-' ||
      substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
      lower(hex(randomblob(6))),
    NEW.id,
    1
  );
  INSERT INTO load_overview_docs (id, overview_id, key, checked)
  SELECT lower(hex(randomblob(16))), o.id, docs.key, 0
  FROM load_overviews o
  CROSS JOIN (
    SELECT 'simulacao' AS key
    UNION ALL SELECT 'interpretacao'
    UNION ALL SELECT 'codigo_falhas'
    UNION ALL SELECT 'rg_dsd_12'
  ) docs
  WHERE o.codigo_id = NEW.id;
END;
