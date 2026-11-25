interface Props {
  texto: string;
  texto2?: string;
  imagen?: string;
}

function Titulo(props: Props) {
  const { texto, texto2, imagen } = props;

  const estilo = {
    color: "blue",
    fontSize: "40px",
  };
  return (
    <h3 className="text-lg font-bold text-gray-800 mb-4">
      {texto}
      {texto2 && <strong style={estilo}>&nbsp;{texto2}</strong>}
      {imagen && (
        <img
          src={imagen}
          alt="Imagen de ejemplo"
          style={{ width: "40px", height: "auto" }}
        />
      )}
    </h3>
  );
}

export default Titulo;
