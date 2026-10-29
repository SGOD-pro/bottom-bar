import Card from './Card';

function App() {
  return (
    <div
      className="app-shell"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#E8DCC6',
        padding: '24px 8px',
      }}
    >
      <Card />
    </div>
  );
}

export default App;
