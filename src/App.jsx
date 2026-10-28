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
        background: '#3e311b',
        padding: '24px 16px',
      }}
    >
      <Card />
    </div>
  );
}

export default App;
