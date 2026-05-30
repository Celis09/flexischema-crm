const fs = require('fs');
const path = require('path');

const primitivesPath = path.join(__dirname, 'components/Primitives.tsx');
const primitives = fs.readFileSync(primitivesPath, 'utf8');
const p2 = primitives
  .replace(/export function ModalShell\(\{([^}]+)\}/, 'export function ModalShell(props: any) {\n  const {$1} = props;')
  .replace(/export function FormField\(\{([^}]+)\}/, 'export function FormField(props: any) {\n  const {$1} = props;')
  .replace(/export function Button\(\{([^}]+)\}/, 'export function Button(props: any) {\n  const {$1} = props;')
  .replace(/export function ErrorBanner\(\{([^}]+)\}/, 'export function ErrorBanner(props: any) {\n  const {$1} = props;')
  .replace(/export function ToggleSwitch\(\{([^}]+)\}/, 'export function ToggleSwitch(props: any) {\n  const {$1} = props;')
  .replace(/export const StatusBadge = memo\(function StatusBadge\(\{([^}]+)\}/, 'export const StatusBadge = memo(function StatusBadge(props: any) {\n  const {$1} = props;')
  .replace(/export function CloseButton\(\{([^}]+)\}/, 'export function CloseButton(props: any) {\n  const {$1} = props;');
fs.writeFileSync(primitivesPath, p2);

const resizablePath = path.join(__dirname, 'components/ResizableTable.tsx');
const resizable = fs.readFileSync(resizablePath, 'utf8');
const r2 = resizable
  .replace(/const ResizableTable = memo\(function ResizableTable\(\{([^}]+)\}/, 'const ResizableTable = memo(function ResizableTable(props: any) {\n  const {$1} = props;')
  .replace(/const HeaderCell = memo\(function HeaderCell\(\{([^}]+)\}/, 'const HeaderCell = memo(function HeaderCell(props: any) {\n  const {$1} = props;')
  .replace(/const ResizeHandle = memo\(function ResizeHandle\(\{([^}]+)\}/, 'const ResizeHandle = memo(function ResizeHandle(props: any) {\n  const {$1} = props;');
fs.writeFileSync(resizablePath, r2);

const contactsTablePath = path.join(__dirname, 'features/contacts/components/ContactsTable.tsx');
const contactsTable = fs.readFileSync(contactsTablePath, 'utf8');
const c2 = contactsTable
  .replace(/const ContactsTable = memo\(function ContactsTable\(\{([\s\S]+?)\}\) \{/, 'const ContactsTable = memo(function ContactsTable(props: any) {\n  const {$1} = props;\n')
  .replace(/const HeaderCell = memo\(function HeaderCell\(\{([\s\S]+?)\}\) \{/, 'const HeaderCell = memo(function HeaderCell(props: any) {\n  const {$1} = props;\n')
  .replace(/const ResizeHandle = memo\(function ResizeHandle\(\{([\s\S]+?)\}\) \{/, 'const ResizeHandle = memo(function ResizeHandle(props: any) {\n  const {$1} = props;\n')
  .replace(/const StatusDropdown = memo\(function StatusDropdown\(\{([\s\S]+?)\}\) \{/, 'const StatusDropdown = memo(function StatusDropdown(props: any) {\n  const {$1} = props;\n');
fs.writeFileSync(contactsTablePath, c2);

console.log("Done");
