#include "box.h"
#include <vector>
#include <string>

class Box_moov {
  public:
    Box_moov();
    ~Box_moov();
    Box * GetBox();
    void AddContent( Box * newcontent, uint32_t offset = 0 );
    void WriteContent( );
  private:
    Box * Container;

    std::vector<Box *> Content;
};//Box_ftyp Class

