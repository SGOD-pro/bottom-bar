import Card from './Card';

function App() {
  return (
    <>
      <div className="app-shell" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#E8DCC6',
      }}>
        <Card />
      </div>
      <div className="screen-size-message">
        Bar not available for the screen size
      </div>
    </>
  );
}

export default App;
