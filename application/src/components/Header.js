function Header(props){
    return (
      <header>
        <div className="container">
          <div className="header">
            <div className="logo">
              <a href="/">DIMSolution.com</a>
            </div>
            <div className="page-name">{ props.title }</div>
          </div>
        </div>
      </header>
    );
}

export default Header;